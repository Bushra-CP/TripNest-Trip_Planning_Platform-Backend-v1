import * as ort from "onnxruntime-node";

const testOnnx = async (): Promise<void> => {
  console.log("Starting ONNX Runtime test...");

  const modelPath = "C:/Users/nowfal/AppData/Local/Temp/e5-model.onnx";

  console.log("Loading ONNX model...");

  const session = await ort.InferenceSession.create(modelPath);

  console.log("ONNX model loaded successfully.");

  console.log("Input names:", session.inputNames);
  console.log("Output names:", session.outputNames);
};

testOnnx().catch((error: unknown) => {
  console.error("ONNX test failed:", error);
});
