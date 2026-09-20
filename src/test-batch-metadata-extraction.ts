import { ChunkMetadataExtractionService } from "@/services/admin/ai/rag/doc-chunk-processing/chunk-metadata-extraction.service";

const testBatchMetadataExtraction = async (): Promise<void> => {
  const service = new ChunkMetadataExtractionService();

  const chunks = [
    `
    Munnar is a famous hill station in Kerala.
    It is known for tea plantations and cool climate.
    `,

    `
    Eravikulam National Park is one of the major
    attractions near Munnar. Visitors can enjoy
    trekking and wildlife watching.
    `,

    `
    Mattupetty Dam is a popular tourist attraction
    in Munnar. Boating is a common activity here.
    `,

    `
    The best time to visit Munnar is from October
    to May. The weather remains pleasant during
    this period.
    `,

    `
    Travelers visiting Munnar should carry warm
    clothes because temperatures can be cool.
    `,
  ];

  const metadata = await service.extractMetadata(chunks);

  console.log(JSON.stringify(metadata, null, 2));
};

testBatchMetadataExtraction();
