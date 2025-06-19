const redis = require("redis");
const client = redis.createClient();

client.on("error", (err) => console.error("Redis error", err));

client.connect(); // for redis v4+

module.exports = client;
