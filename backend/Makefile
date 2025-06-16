.PHONY: db dev

db:
	docker run -it --rm -d \
		--name mongodb \
		-e MONGO_INITDB_ROOT_USERNAME=root \
		-e MONGO_INITDB_ROOT_PASSWORD=password \
		-e MONGO_INITDB_DATABASE=socialrobot \
		-p 27018:27017 \
		-v $(PWD)/../data:/data/db \
		mongo:noble

dev:
	. ./dev.env && poetry run python -X dev -m api