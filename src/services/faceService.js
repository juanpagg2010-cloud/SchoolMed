import {
  CreateCollectionCommand,
  DeleteFacesCommand,
  DescribeCollectionCommand,
  IndexFacesCommand,
  RekognitionClient,
  SearchFacesByImageCommand,
} from "@aws-sdk/client-rekognition";
import User from "../models/userModel.js";

const PROVIDER = "aws-rekognition";
const DEFAULT_REGION = "us-east-1";
const DEFAULT_COLLECTION_ID = "schoolmed-acudientes";
const DEFAULT_MATCH_THRESHOLD = 95;
const DEFAULT_VERIFICATION_TTL_SECONDS = 5 * 60;

const getCollectionId = () => process.env.AWS_REKOGNITION_COLLECTION_ID || DEFAULT_COLLECTION_ID;
const getRegion = () => process.env.AWS_REGION || DEFAULT_REGION;
const getMatchThreshold = () => Number(process.env.FACE_MATCH_MIN_SIMILARITY || DEFAULT_MATCH_THRESHOLD);
const getVerificationTtlMs = () => Number(process.env.FACE_VERIFICATION_TTL_SECONDS || DEFAULT_VERIFICATION_TTL_SECONDS) * 1000;

const client = new RekognitionClient({
  region: getRegion(),
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

const makeHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeImageBytes = (file) => {
  if (!file?.buffer?.length) {
    throw makeHttpError("Debes enviar una captura facial valida.", 400);
  }

  return file.buffer;
};

const ensureCollection = async () => {
  const collectionId = getCollectionId();

  try {
    await client.send(new DescribeCollectionCommand({ CollectionId: collectionId }));
  } catch (error) {
    if (error.name !== "ResourceNotFoundException") {
      throw error;
    }

    await client.send(new CreateCollectionCommand({ CollectionId: collectionId }));
  }

  return collectionId;
};

const findUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw makeHttpError("Usuario no encontrado.", 404);
  }

  if (user.role !== "Acudiente") {
    throw makeHttpError("La biometria facial solo aplica para acudientes.", 403);
  }

  return user;
};

const deletePreviousFace = async (user) => {
  if (!user.faceAuth?.faceId) return;

  try {
    await client.send(new DeleteFacesCommand({
      CollectionId: user.faceAuth.collectionId || getCollectionId(),
      FaceIds: [user.faceAuth.faceId],
    }));
  } catch (error) {
    console.warn(`No se pudo eliminar el rostro anterior: ${error.message}`);
  }
};

// Registra el rostro base del acudiente en la coleccion de Rekognition.
export const registerGuardianFace = async (userId, file) => {
  const user = await findUser(userId);
  const collectionId = await ensureCollection();
  const imageBytes = normalizeImageBytes(file);
  const externalFaceId = String(user._id);

  await deletePreviousFace(user);

  const response = await client.send(new IndexFacesCommand({
    CollectionId: collectionId,
    DetectionAttributes: ["DEFAULT"],
    ExternalImageId: externalFaceId,
    Image: { Bytes: imageBytes },
    MaxFaces: 1,
    QualityFilter: "AUTO",
  }));

  const faceRecord = response.FaceRecords?.[0];

  if (!faceRecord?.Face?.FaceId) {
    throw makeHttpError("No se detecto un rostro claro. Usa buena luz y mira de frente a la camara.", 422);
  }

  user.faceAuth = {
    enabled: true,
    provider: PROVIDER,
    collectionId,
    externalFaceId,
    faceId: faceRecord.Face.FaceId,
    similarityThreshold: getMatchThreshold(),
    registeredAt: new Date(),
    lastVerifiedAt: undefined,
    lastVerification: {
      success: false,
      similarity: 0,
      verifiedAt: undefined,
    },
  };

  await user.save();

  const userData = user.toObject();
  delete userData.password;

  return {
    faceId: faceRecord.Face.FaceId,
    user: userData,
  };
};

// Compara la captura actual contra el rostro registrado del acudiente.
export const verifyGuardianFace = async (userId, file) => {
  const user = await findUser(userId);
  const imageBytes = normalizeImageBytes(file);

  if (!user.faceAuth?.enabled || !user.faceAuth?.faceId) {
    throw makeHttpError("Primero debes registrar tus datos biometricos faciales.", 403);
  }

  const threshold = user.faceAuth.similarityThreshold || getMatchThreshold();
  const response = await client.send(new SearchFacesByImageCommand({
    CollectionId: user.faceAuth.collectionId || getCollectionId(),
    FaceMatchThreshold: threshold,
    Image: { Bytes: imageBytes },
    MaxFaces: 1,
    QualityFilter: "AUTO",
  }));

  const match = response.FaceMatches?.find((item) => item.Face?.FaceId === user.faceAuth.faceId);
  const similarity = match?.Similarity || 0;
  const success = similarity >= threshold;
  const verifiedAt = new Date();

  user.faceAuth.lastVerification = {
    success,
    similarity,
    verifiedAt,
  };
  user.faceAuth.lastVerifiedAt = success ? verifiedAt : user.faceAuth.lastVerifiedAt;
  await user.save();

  if (!success) {
    throw makeHttpError("El rostro no coincide con los datos biometricos registrados.", 403);
  }

  return {
    similarity,
    threshold,
    verifiedAt,
  };
};

// Garantiza que la ultima verificacion facial sea reciente antes de crear una excusa.
export const requireRecentFaceVerification = async (userId) => {
  const user = await findUser(userId);

  if (!user.faceAuth?.enabled || !user.faceAuth?.faceId) {
    throw makeHttpError("Debes registrar tus datos biometricos faciales antes de enviar excusas.", 403);
  }

  const lastVerifiedAt = user.faceAuth.lastVerifiedAt ? new Date(user.faceAuth.lastVerifiedAt) : null;
  const isFresh = lastVerifiedAt && Date.now() - lastVerifiedAt.getTime() <= getVerificationTtlMs();

  if (!isFresh) {
    throw makeHttpError("Confirma tu identidad con el escaneo facial antes de enviar la excusa.", 403);
  }

  return {
    method: "face-scan",
    provider: PROVIDER,
    success: true,
    similarity: user.faceAuth.lastVerification?.similarity || 0,
    verifiedAt: lastVerifiedAt,
  };
};

export const getFaceStatus = async (userId) => {
  const user = await findUser(userId);

  return {
    enabled: Boolean(user.faceAuth?.enabled && user.faceAuth?.faceId),
    provider: user.faceAuth?.provider || PROVIDER,
    collectionId: user.faceAuth?.collectionId || getCollectionId(),
    registeredAt: user.faceAuth?.registeredAt || null,
    lastVerifiedAt: user.faceAuth?.lastVerifiedAt || null,
    similarityThreshold: user.faceAuth?.similarityThreshold || getMatchThreshold(),
  };
};

export default {
  getFaceStatus,
  registerGuardianFace,
  requireRecentFaceVerification,
  verifyGuardianFace,
};
