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
git clone https://github.com/MarianoEnzo/tinyUrl
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

## Organización del proyecto

El proyecto está dividido en tres módulos con responsabilidades bien delimitadas:

- **`urls`** — creación de URLs cortas y redirección. Es el núcleo de la app.
- **`events`** — registro de cada acceso a un link. Recibe trabajo de `urls` de forma asíncrona.
- **`stats`** — consultas de lectura sobre los eventos registrados. No escribe nada.

Esta separación no es solo organizativa. Refleja tres flujos de datos distintos:

1. **Escritura rápida**: crear una URL es una operación síncrona que responde al usuario de inmediato.
2. **Escritura diferida**: registrar un clic no puede bloquear la redirección. `urls` encola el evento en BullMQ y retorna. `events` lo procesa en background.
3. **Lectura pura**: `stats` nunca escribe. Consulta directamente los repositorios de `urls` y `events` para componer la respuesta.

### Cómo se comunican los módulos

`urls` y `events` no se llaman directamente entre sí. La comunicación pasa por una cola de BullMQ (`access-events`):

```
[UrlService] --enqueue--> [Queue: access-events] --process--> [EventsWorker] --> [EventRepository]
```

Esto tiene una consecuencia intencional: si el worker de eventos se cae o tarda, la redirección no se ve afectada. Los jobs persisten en Redis y se procesan cuando el worker vuelve, con reintentos automáticos si falla la escritura en MongoDB.

`stats` sí depende directamente de ambos repositorios, pero solo para leer. Se eligió acceso directo en lugar de pasar por servicios intermedios porque `stats` no necesita ninguna lógica de negocio de `urls` ni de `events`, solo datos.

## Patrón Repository

Cada módulo con acceso a base de datos tiene su propio Repository (`UrlRepository`, `EventRepository`). Los Services nunca usan los modelos de Mongoose directamente.

Esto tiene dos ventajas concretas:

- **Los Services son testeables sin base de datos.** Se mockea el Repository y listo. No hay que levantar Mongoose en los tests unitarios.
- **El acceso a datos es intercambiable.** Si el día de mañana se migra de MongoDB a otra base, el cambio está contenido en el Repository. El Service no se entera.

## Abstracción de caché

`UrlCacheService` es el único lugar de toda la app que sabe que el cache es Redis. Si mañana habría que cambiarlo por Memcached o cualquier otra cosa, el cambio está contenido ahí y el resto de la app no se entera.

No está hecho al 100% — el servicio todavía importa el tipo de ioredis, así que un swap real tocaría dos archivos en lugar de uno. Para cerrarlo del todo haría falta una interfaz que defina `get` y `set`, pero es una mejora incremental sobre lo que está, no un problema de diseño.
