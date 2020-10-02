import {Db, MongoClient} from 'mongodb';

const URI = process.env.DB_URL as string;

export let db: Db;

export async function connect() {
  const client = await MongoClient.connect(URI, {
    // useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,
    // useFindAndModify: true,
  });

  db = client.db("games");

  console.log("Database Connected");
}
