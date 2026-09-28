import { injectable } from "inversify";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/config/env";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

@injectable()
export class TripTalesMediaUnderstandingService {
  // Gemini AI client
  private readonly _ai: GoogleGenAI;

  // Gemini model used for image and video understanding
  private readonly _model: string;

  constructor() {
    this._ai = new GoogleGenAI({
      apiKey: env.GOOGLE_API_KEY,
    });

    this._model = env.GEMINI_MODEL;
  }

  /**
   * // Generate a description for a TripTales image
   *
   * @param {Buffer} buffer
   * @param {string} mimeType
   * @return {*}  {Promise<string>}
   * @memberof TripTalesMediaUnderstandingService
   */
  public async describeImage(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      // Convert the image into base64 format
      const base64Image = buffer.toString("base64");

      // Send the image and instructions to Gemini
      const response = await this._ai.models.generateContent({
        model: this._model,

        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
          {
            text: `
Analyze this travel image for a travel knowledge base.

Describe only information that is useful for travel-related
search and recommendations.

Include:
- visible place or attraction if identifiable
- destination or location clues
- landscape
- activities
- accommodation if visible
- restaurants or food if visible
- transportation if visible
- important travel-related details

Do not invent information that cannot be seen.

Return a concise natural-language description.
              `.trim(),
          },
        ],
      });

      return response.text?.trim() || "";
    } catch (error) {
      console.error("Failed to understand TripTales image:", error);

      throw error;
    }
  }

  /**
   * Generate a description for a TripTales video
   *
   * @param {Buffer} buffer
   * @param {string} mimeType
   * @return {*}  {Promise<string>}
   * @memberof TripTalesMediaUnderstandingService
   */
  public async describeVideo(buffer: Buffer, mimeType: string): Promise<string> {
    // Get the correct file extension for the video
    const extension = this.getVideoExtension(mimeType);

    // Create a temporary file path
    const tempFilePath = path.join(os.tmpdir(), `tripnest-${Date.now()}${extension}`);

    try {
      await fs.writeFile(tempFilePath, buffer);

      // Upload the temporary video file to Gemini
      let uploadedFile = await this._ai.files.upload({
        file: tempFilePath,

        config: {
          mimeType,
        },
      });

      // Wait until Gemini finishes processing the video
      while (uploadedFile.state === "PROCESSING") {
        await this.delay(2000);

        uploadedFile = await this._ai.files.get({
          name: uploadedFile.name!,
        });
      }

      if (uploadedFile.state === "FAILED") {
        throw new Error("Gemini failed to process the video");
      }

      // Ask Gemini to understand the processed video
      const response = await this._ai.models.generateContent({
        model: this._model,

        contents: [
          {
            fileData: {
              fileUri: uploadedFile.uri!,
              mimeType: uploadedFile.mimeType!,
            },
          },

          {
            text: `
Analyze this travel video for a travel knowledge base.

Describe the useful travel information present in the video.

Include:
- places or attractions shown
- destination or location clues
- activities
- landscapes
- food or restaurants if visible
- accommodation if visible
- transportation if visible
- travel tips supported by the video
- useful spoken information if understandable

Do not invent information.

Return a concise natural-language description.
            `.trim(),
          },
        ],
      });

      return response.text?.trim() || "";
    } catch (error) {
      console.error("Failed to understand TripTales video:", error);

      throw error;
    } finally {
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // Ignore cleanup error
      }
    }
  }

  /**
   * Get the correct file extension based on video type
   *
   * @private
   * @param {string} mimeType
   * @return {*}  {string}
   * @memberof TripTalesMediaUnderstandingService
   */
  private getVideoExtension(mimeType: string): string {
    switch (mimeType) {
      case "video/mp4":
        return ".mp4";

      case "video/webm":
        return ".webm";

      case "video/quicktime":
        return ".mov";

      default:
        return ".mp4";
    }
  }

  /**
   * Wait for a specific amount of time
   *
   * @private
   * @param {number} milliseconds
   * @return {*}  {Promise<void>}
   * @memberof TripTalesMediaUnderstandingService
   */
  private async delay(milliseconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
