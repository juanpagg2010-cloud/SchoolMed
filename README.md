# SchoolMed

SchoolMed es una API REST para gestionar excusas medicas escolares. El sistema permite que los acudientes registren excusas, validen el envio mediante un codigo unico enviado por correo, y que coordinadores revisen las solicitudes antes de que los docentes puedan consultarlas.

## Caracteristicas

- Autenticacion con JWT.
- Roles de usuario: `Acudiente`, `Profesor` y `Coordinador`.
- Registro e inicio de sesion.
- Creacion de excusas medicas por acudientes.
- Verificacion de excusa con codigo unico por correo.
- Reenvio del codigo de verificacion.
- Revision institucional por coordinadores.
- Consulta de excusas aprobadas por docentes.
- Conexion a MongoDB con Mongoose.
- Envio de correos con Nodemailer y Brevo SMTP.

## Tecnologias

- Node.js
- Express
- MongoDB
- Mongoose
- JSON Web Token
- Bcrypt
- Nodemailer
- Brevo SMTP

## Estructura del proyecto

```txt
src/
  app.js
  server.js
  config/
    db.js
  controllers/
  middlewares/
  models/
  routes/
  services/
```

## Instalacion

```bash
npm install
```

## Variables de entorno

Crea un archivo `.env` en la raiz del proyecto usando como base `.env.example`.

```env
PORT=3000

MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/schoolmed

JWT_SECRET=coloca_una_clave_larga_y_segura
JWT_EXPIRES_IN=1d

SMTP_HOST=smtp-relay-offshore-southamerica-east-v2.sendinblue.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_login_smtp_de_brevo
SMTP_PASS=tu_smtp_key_de_brevo
MAIL_FROM=tu_correo_verificado_en_brevo
```

> No subas el archivo `.env` al repositorio. Ya esta protegido en `.gitignore`.

## Ejecutar el proyecto

Modo desarrollo:

```bash
npm run dev
```

Modo produccion:

```bash
npm start
```

La API queda disponible en:

```txt
http://localhost:3000
```

Health check:

```txt
GET /api/health
```

## Flujo principal

1. El acudiente inicia sesion.
2. El acudiente crea una excusa medica.
3. La excusa se guarda como `PendienteVerificacion`.
4. El sistema envia un codigo unico al correo del acudiente.
5. El acudiente verifica el codigo.
6. La excusa cambia a `PendienteRevision`.
7. El coordinador revisa la excusa.
8. Si la aprueba, queda como `Aprobada`.
9. El docente puede consultar las excusas aprobadas.

## Estados de una excusa

```txt
PendienteVerificacion
PendienteRevision
Aprobada
Rechazada
Cancelada
```

## Endpoints

Base recomendada:

```txt
/api/v1
```

Tambien se mantiene `/api` como alias.

### Autenticacion

```txt
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Usuarios

Solo coordinadores.

```txt
GET   /api/v1/users
PATCH /api/v1/users/:id
```

### Excusas medicas

Acudiente:

```txt
POST /api/v1/medical-excuses
GET  /api/v1/medical-excuses/me
POST /api/v1/medical-excuses/:id/verification
POST /api/v1/medical-excuses/:id/verification/resend
```

Coordinador:

```txt
GET   /api/v1/medical-excuses/review
GET   /api/v1/medical-excuses/review/by-grade
PATCH /api/v1/medical-excuses/:id/approve
PATCH /api/v1/medical-excuses/:id/reject
PATCH /api/v1/medical-excuses/:id/cancel
```

Profesor:

```txt
GET /api/v1/medical-excuses/classroom
```

Consulta por id:

```txt
GET /api/v1/medical-excuses/:id
```

## Ejemplo de autenticacion

Registro:

```json
{
  "name": "Juan Perez",
  "email": "juan@example.com",
  "password": "123456",
  "role": "Acudiente",
  "phone": "3001234567"
}
```

Login:

```json
{
  "email": "juan@example.com",
  "password": "123456"
}
```

El login devuelve un token JWT. Para acceder a rutas protegidas envia:

```txt
Authorization: Bearer TU_TOKEN
```

## Ejemplo de excusa medica

Crear excusa:

```json
{
  "nombreEstudiante": "Maria Perez",
  "documentoEstudiante": "123456789",
  "grado": "7",
  "grupo": "A",
  "motivo": "Cita medica",
  "descripcion": "La estudiante asistio a una cita medica.",
  "fechaInicio": "2026-06-07",
  "fechaFin": "2026-06-08"
}
```

Verificar codigo:

```json
{
  "codigo": "123456"
}
```

Rechazar excusa:

```json
{
  "motivoRechazo": "El soporte medico no es legible."
}
```

Cancelar excusa:

```json
{
  "motivoCancelacion": "La excusa fue registrada por error."
}
```

## Seguridad

- Las contrasenas se guardan hasheadas con bcrypt.
- El codigo de verificacion de la excusa se guarda hasheado.
- El codigo expira despues de 10 minutos.
- La verificacion permite un maximo de 5 intentos.
- Los roles se validan con middlewares.
- Las variables sensibles se mantienen fuera de Git mediante `.gitignore`.

## Autor

Hecho por Juan pablo Barragan y Juan David Garcia
