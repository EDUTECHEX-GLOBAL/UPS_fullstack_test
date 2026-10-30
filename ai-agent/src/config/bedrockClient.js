const { BedrockRuntimeClient } = require("@aws-sdk/client-bedrock-runtime");

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_MODEL_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_MODEL_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_MODEL_ACCESS_KEY,
  },
});

module.exports = bedrockClient;
