import { S3 } from "aws-sdk";
import { readFileSync } from "fs";
import { GridFSBucket, MongoClient, ObjectId } from "mongodb";

const prettyBytes = require("pretty-bytes");
const mode = process.argv[2];

interface AppConfig {
  mongoUrl: string;
  region: string;
  bucket: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const config = JSON.parse(
  readFileSync("./config.json").toString()
) as AppConfig;

interface GridFSEntry {
  _id: ObjectId;
  name: string;
  size: number;
  type: string;
  rid: string;
  store: string;
  complete: boolean;
  uploading: boolean;
  extension: string;
  progress: number;
  userId: string;
  token: string;
  uploadedAt: Date;
  url: string;
}

function createS3Path(d: GridFSEntry) {
  return `${config.prefix}/uploads/${d.rid}/${d.userId}/${d._id}`;
}

async function main() {
  let client: MongoClient | null = null;
  try {
    console.log(`connecting to ${config.mongoUrl}...`);
    client = await MongoClient.connect(config.mongoUrl);
    console.log(`connected.`);
    const db = client.db();
    const targets: GridFSEntry[] = await db
      .collection("rocketchat_uploads")
      .find({ store: "GridFS:Uploads" })
      .filter((d: GridFSEntry) => d.uploading === false && d.complete === true)
      .toArray();

    const s3 = new S3({
      apiVersion: "2006-03-01",
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });

    let i = 0;
    for (const d of targets) {
      const id = d._id;
      const position = `(${++i}/${targets.length})`;
      const s3FilePath = createS3Path(d);

      if (mode === "upload") {
        // Get the contents.
        const contentPromise = new Promise((resolve, reject) => {
          const st = new GridFSBucket(db, {
            bucketName: "rocketchat_uploads",
            chunkSizeBytes: 340 * 1024
          }).openDownloadStream(id);
          let result: Buffer[] = [];
          st.on("data", (chunk: Buffer) => {
            result.push(chunk);
          });
          st.on("close", () => {});
          st.on("end", () => {
            resolve(Buffer.concat(result));
          });
          st.on("error", err => {
            reject(err);
          });
        });

        let content: any;
        try {
          content = await contentPromise;
        } catch (e) {
          console.error(
            `${position} Failed to get the content of ${d._id}, skipped.`
          );
          continue;
        }

        // Upload to S3.
        console.log(
          `${position} Uploading: ${d._id} => ${s3FilePath} (${prettyBytes(
            content.length
          )})`
        );
        await s3
          .putObject(
            {
              Bucket: config.bucket,
              Key: s3FilePath,
              ContentType: d.type,
              Body: content
            },
            (err, data) => {}
          )
          .promise();
      }

      if (mode === "replace") {
        // Check if the file is available on S3.
      }
    }

    return 0;
  } catch (e) {
    console.error(`Failed to process.`);
    throw e;
  } finally {
    if (client) {
      (client as MongoClient).close();
    }
  }
}

main().then(num => {
  process.exit(num);
});
