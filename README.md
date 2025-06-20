# Social_Robot_WoZ_Toolkit

The repository contains 3 services:

1. Backend (`./backend`)
2. Control Panel Frontend (`./frontend/controlpanel`)
3. Bot Frontend (`./frontend/bot`)

Two additional services are required to be running for the project to work:

1. Ollama server ([Check here!](https://ollama.com/))
2. MongoDB database

Standard ports used for the services are:

- Backend: `1339`
- Control Panel: `3001`
- Bot: `5001`
- Ollama: `11434`
- MongoDB: `27018` (`27017` within the container)

Packages:

| Environment | Package                     | Version  | Description                                                           |
| ----------- | --------------------------- | -------- | --------------------------------------------------------------------- |
| Frontend    | `react`                     | ^18.3.1  | A JavaScript library for building user interfaces                     |
| Frontend    | `react-redux`               | ^9.1.2   | A JavaScript library for UI state management                          |
| Frontend    | `@reduxjs/toolkit`          | ^2.2.7   | Toolset for efficient Redux development                               |
| Frontend    | `sass`                      | ^1.77.7  | CSS extension for styling the webpage                                 |
| Frontend    | `typescript`                | ^5.5.4   | JavaScript extension for strong typing                                |
| Backend     | `fastapi`                   | ^0.111.1 | Web framework for building APIs with Python                           |
| Backend     | `uvicorn`                   | ^0.30.3  | ASGI server implementation for serving FastAPI APIs                   |
| Backend     | `pydantic`                  | ^2.8.2   | Data validation and settings management using Python type annotations |
| Backend     | `google-cloud-speech`       | ^2.27.0  | Google’s speech-to-text Python client                                 |
| Backend     | `google-cloud-texttospeech` | ^2.17.2  | Google’s text-to-speech Python client                                 |
| Backend     | `pymongo`                   | ^4.10.1  | Python driver for MongoDB database                                    |
| Backend     | `proquint`                  | ^0.2.1   | Implementation of human-readable IDs                                  |

Local LLMs used in this toolkit:

| Model Name      | Version | Developer/Organization | Parameter Size | Model Size |
| --------------- | ------- | ---------------------- | -------------- | ---------- |
| `llama`         | ^3.2    | Meta                   | 3.21B          | 2 GB       |
| `gemma`         | ^2.0    | Google                 | 9.24B          | 5.4 GB     |
| `Phi`           | ^3.5    | Microsoft              | 3.82B          | 2.2 GB     |
| `nemotron-mini` | ^1.0    | NVIDIA                 | 4.19B          | 2.7 GB     |
| `qwen`          | ^2.5    | AliBaba                | 7.62B          | 4.7 GB     |


## Running the project

To get the project running, one of the two methods can be used. Both the methods also get the database up in running. Additional pre-requisites are:

- Docker installed on your machine.
- Ollama server running on port `11434`.
- Google Cloud Service Account JSON file in the `./backend` directory with name `gcp-service-account.json`. This service account should have access to [Google Text-to-Speech API](https://cloud.google.com/text-to-speech) and [Google Speech-to-Text API](https://cloud.google.com/speech-to-text).

---

### Method 1. Using Docker Compose (Recommended)

Docker must be up and running.

Using the command below, the project will be built and run with all the services.

```bash
docker compose up --build
```

This will run the backend on port `1339`, control panel on port `3001`, and the bot on port `5001`. The database will be exposed on host machine's port `27018` (forwarded to container's port `27017`) and can be used for browsing the database using any database client like [MongoDB Compass](https://www.mongodb.com/try/download/compass).

`docker ps` should show 4 containers running; `mongodb`, `backend`, `bot` and `controlpanel`.

The command doesn't exit after the services are running and hence it can be used for development process as it will automatically restart the services when the code changes. The database container will mount the `./data` directory as a volume from the host machine to the container. This means that the database data will be persisted even after the container is stopped manually.

---

### Method 2. Running backend, bot and control panel individually:

This method requires you to have `python 3.12+`, `poetry` (package manager for python), `node (v20+)` and `yarn` (package manager for node) installed on your machine.

#### Backend

Into the backend directory:

1. Install dependencies (only during first run)

```bash
poetry install
```

2. Create `dev.env` file in backend directory with following content:

```bash
export HOST=127.0.0.1 # backend host
export PORT=1339 # backend port
export DEBUG=1 # if the application is in debug mode
export GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account.json
export MONGODB_URL=mongodb://root:password@localhost:27018/ # forwarding to port 27017 of container
export DB_NAME=socialrobot
export LLM_URL=http://localhost:11434 # url of ollama server
```

3. Get the database running:

To persist the database data, the `./data` directory should be mounted as a volume to the container. Make sure to update the path to the `./data` directory in the `./backend/Makefile` file.

```bash
make db # runs the database container
```

4. Run the backend server

```bash
make dev # runs the backend server
```

This will run the backend on port `1339` and expose the database on port `27018`.

#### Control Panel

Into the controlpanel directory:

1. Install dependencies (only during first run)

```bash
yarn install
```

2. Create `.env` file in controlpanel root with following content:

```bash
BROWSER=none
PORT=3001
REACT_APP_SERVER_URL=http://localhost:1339
REACT_APP_BOT_URL=http://localhost:5001
```

3. Start server

```bash
yarn start
```

This will run the control panel on port `3001`.

#### Bot

Into the bot directory:

1. Install dependencies (only during first run)

```bash
yarn install
```

2. Create `.env` file in bot root with following content:

```bash
BROWSER=none
PORT=5001
REACT_APP_SERVER_URL=http://localhost:1339
```

3. Start server

```bash
yarn start
```

This will run the bot on port `5001`.
