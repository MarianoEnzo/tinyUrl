# TinyURL Groobyte

Acortador de URLs construido con NestJS, MongoDB, Redis y BullMQ. Soporta alias personalizados, seguimiento de clics y estadísticas por link.

## Stack tecnológico

| Capa            | Tecnología                               |
| --------------- | ---------------------------------------- |
| Framework       | NestJS 11 (Node.js)                      |
| Base de datos   | MongoDB 7 (via Mongoose)                 |
| Caché           | Redis 7 (via ioredis)                    |
| Cola de trabajo | BullMQ                                   |
| Frontend        | HTML/CSS/JS vanilla (archivos estáticos) |
| Runtime         | Node.js 22                               |

## Funcionalidades

- Acortar cualquier URL con un código aleatorio de 10 caracteres
- Alias personalizado opcional (3–10 caracteres, letras/números/guiones)
- Redirección HTTP al acceder al link corto
- Registro asíncrono de clics (IP, User-Agent, timestamp) via BullMQ
- Estadísticas por link: total de clics y fecha del último clic
- Capa de caché en Redis para redirecciones rápidas en links frecuentes

## Requisitos previos

- Docker y Docker Compose

## Levantar con Docker Compose

```bash
git clone <repo-url>
cd tiny-url
docker compose up --build
```

Listo. La app queda disponible en `http://localhost:3000`.

No es necesario crear ningún archivo `.env` los valores por defecto ya están configurados para el entorno Docker.

## Ejecutar localmente (sin Docker)

Levantar la infraestructura:

```bash
docker compose up mongo redis -d
```

Copiar las variables de entorno y levantar la app:

```bash
cp .env.example .env
npm install
npm run start:dev
```

## Variables de entorno

| Variable     | Default Docker                  | Default local                       | Descripción                     |
| ------------ | ------------------------------- | ----------------------------------- | ------------------------------- |
| `PORT`       | `3000`                          | `3000`                              | Puerto en el que escucha la app |
| `MONGO_URI`  | `mongodb://mongo:27017/tinyurl` | `mongodb://localhost:27017/tinyurl` | Cadena de conexión a MongoDB    |
| `REDIS_HOST` | `redis`                         | `localhost`                         | Host de Redis                   |
| `REDIS_PORT` | `6379`                          | `6379`                              | Puerto de Redis                 |

Para sobrescribir cualquier valor en Docker, crear un `.env` en la raíz se aplica encima de los defaults.

## Endpoints de la API

| Método | Ruta               | Descripción                     |
| ------ | ------------------ | ------------------------------- |
| `POST` | `/`                | Crear una URL corta             |
| `GET`  | `/:code`           | Redirigir a la URL original     |
| `GET`  | `/api/stats/:code` | Obtener estadísticas de un link |

### POST `/` Acortar una URL

**Body:**

```json
{
  "originalUrl": "https://ejemplo.com/ruta/muy/larga",
  "alias": "mi-link"
}
```

`alias` es opcional. Si se omite, se genera un código aleatorio de 10 caracteres.

**Respuesta:**

```json
{
  "code": "mi-link"
}
```

### GET `/api/stats/:code`

**Respuesta:**

```json
{
  "code": "AbC123",
  "totalClicks": 42,
  "lastClick": "2025-06-11T14:30:00.000Z"
}
```

## Tests

```bash
# Tests unitarios
npm run test

# Tests con cobertura
npm run test:cov
```

## Decisiones técnicas

### NestJS

Tiene una arquitectura modular que obliga a separar responsabilidades desde el principio. Inyección de dependencias nativa, validación de DTOs con decoradores, y soporte directo para todo lo que usa el proyecto (Mongoose, BullMQ, archivos estáticos). El código queda ordenado y es fácil de navegar.

### MongoDB

Los datos de este proyecto son simples: una URL tiene una dirección original y un código corto, y cada clic es un evento con fecha, IP y user-agent. No hay relaciones complejas entre entidades, así que una base de datos de documentos encaja perfectamente. Además es fácil de escalar si el volumen de eventos de clic crece mucho.

### Redis como caché

Es rápido, es algo con lo que tengo experiencia y es parte del stack que usa Groobyte. Cachear las URLs resueltas evita ir a la base de datos en cada redirect, que es la operación más frecuente de toda la app.

### BullMQ para registro asíncrono de clics

El redirect tiene que ser inmediato registrar el clic no puede bloquear eso. La solución es procesar ese evento de forma asíncrona: BullMQ encola el trabajo y un worker lo procesa en background sin afectar la respuesta al usuario.

La elección de BullMQ específicamente tiene varias razones:

- **Reutiliza Redis**: como Redis ya estaba en la infra para el caché, BullMQ corre sobre la misma instancia sin agregar ninguna dependencia nueva al stack.
- **Persistencia**: los jobs quedan guardados en Redis. Si el worker se cae o se reinicia, los eventos no se pierden se procesan cuando vuelve.
- **Reintentos automáticos**: si algo falla al guardar un evento en la base de datos, BullMQ reintenta el job sin que haya que programar esa lógica manualmente.
- **Simplicidad**: la integración con NestJS es directa con `@nestjs/bullmq`, y para el volumen de una app como esta es más que suficiente.

Alternativas como RabbitMQ o Kafka fueron descartadas porque agregan infraestructura extra y complejidad operacional que no se justifica acá. Kafka está pensado para millones de eventos por segundo con múltiples consumidores y retención de logs es una herramienta enorme para un problema chico. BullMQ hace el trabajo con lo que ya tenemos.

### nanoid para generación de códigos

Genera códigos cortos, seguros para URLs y con muy baja probabilidad de colisión. Simple y hace el trabajo.

### Frontend estático

Un único `index.html` servido directamente por NestJS. Sin build, sin framework , lo justo y necesario para interactuar con la API.
