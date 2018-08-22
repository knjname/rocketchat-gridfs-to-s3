# [Rocket.chat](https://rocket.chat) GridFS => S3 converter

This project is in progress.

## How to run

### Install JavaScript tools

Install the following tools.

- NodeJS
- Yarn

### Get the dependencies

```console
$ yarn
```

### Edit `config.json`

According to `config.json.template`, you have to create `config.json` file.

### Upload files stored in GridFS to S3

All the files stored in GridFS will get stored in the S3 bucket.

```
$ yarn start upload
:
:

(1/2264) Uploading: XXX => ZZZ/converted/uploads/GENERAL/YYY/XXX (1.91 MB)
```

### Replace existing GridFS entry with S3's one. (Original GridFS data will be lost.)

WIP

## License

MIT
