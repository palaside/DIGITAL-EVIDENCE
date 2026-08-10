import { describe, expect, it, vi } from "vitest";
import { buildSfxArchive, UploadedFile, PackageOptions } from "./sfxBuilder";
import JSZip from "jszip";

// Mock bytes for the stub and files
const mockStubText = "MZSFXSTUBPLACEHOLDER";
const mockStubBytes = new Uint8Array(
  mockStubText.split("").map((c) => c.charCodeAt(0))
);
const mockImageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // Mock PNG header

vi.stubGlobal("fetch", async (url: string) => {
  if (url === "/assets/sfx_stub.exe") {
    return {
      ok: true,
      arrayBuffer: async () => mockStubBytes.buffer,
    };
  }
  if (url.startsWith("data:")) {
    return {
      ok: true,
      blob: async () => new Blob([mockImageBytes], { type: "image/png" }),
    };
  }
  throw new Error(`Unhandled fetch mock URL: ${url}`);
});

describe("sfxBuilder", () => {
  const options: PackageOptions = {
    archiveName: "test-evidence-pack",
    archiveFormat: "rar",
    password: "SecurePassword123!",
    confirmPassword: "SecurePassword123!",
    legalDisclaimer: "This is a custom test legal disclaimer text.",
    includePdf: true,
  };

  const uploadedFiles: UploadedFile[] = [
    { name: "evidence-1.png", url: "data:image/png;base64,iVBORw0KGgoAAA" },
    { name: "evidence-2.png", url: "data:image/png;base64,iVBORw0KGgoAAB" },
  ];

  it("should successfully build an SFX executable file in browser", async () => {
    const pdfBlob = new Blob([new Uint8Array([37, 80, 68, 70])], { type: "application/pdf" }); // %PDF
    const ocrBlob = new Blob([JSON.stringify({ ocr: "test ocr" })], { type: "application/json" });

    const resultFile = await buildSfxArchive(
      options,
      uploadedFiles,
      pdfBlob,
      ocrBlob
    );

    // 1. Verify File metadata
    expect(resultFile).toBeInstanceOf(File);
    expect(resultFile.name).toBe("test-evidence-pack.exe");
    expect(resultFile.type).toBe("application/octet-stream");

    // 2. Verify stub concatenation
    const resultBuffer = await resultFile.arrayBuffer();
    const resultBytes = new Uint8Array(resultBuffer);

    // Header must start with the mock stub bytes
    const headerSlice = resultBytes.slice(0, mockStubBytes.length);
    expect(Array.from(headerSlice)).toEqual(Array.from(mockStubBytes));

    // 3. Extract the ZIP portion and verify its contents
    const zipBytes = resultBytes.slice(mockStubBytes.length);
    const zip = await JSZip.loadAsync(zipBytes);

    // Verify file entries in the ZIP
    expect(zip.file("evidence-1.png")).not.toBeNull();
    expect(zip.file("evidence-2.png")).not.toBeNull();
    expect(zip.file("evidence.pdf")).not.toBeNull();
    expect(zip.file("slip-ocr-analysis.json")).not.toBeNull();
    expect(zip.file("disclaimer.txt")).not.toBeNull();

    // Verify disclaimer content
    const disclaimerContent = await zip.file("disclaimer.txt")?.async("string");
    expect(disclaimerContent).toBe("This is a custom test legal disclaimer text.");

    // 4. Verify WinRAR SFX commands in the ZIP comment
    expect((zip as any).comment).toContain(";The comment below contains SFX script commands");
    expect((zip as any).comment).toContain("Title=test-evidence-pack");
    expect((zip as any).comment).toContain("Text\r\n{\r\nThis is a custom test legal disclaimer text.\r\n}");
  });

  it("should fall back to default disclaimer if none is provided", async () => {
    const optionsNoDisclaimer: PackageOptions = {
      ...options,
      legalDisclaimer: "",
    };

    const resultFile = await buildSfxArchive(
      optionsNoDisclaimer,
      uploadedFiles
    );

    const resultBytes = new Uint8Array(await resultFile.arrayBuffer());
    const zipBytes = resultBytes.slice(mockStubBytes.length);
    const zip = await JSZip.loadAsync(zipBytes);

    expect((zip as any).comment).toContain("DIGITAL EVIDENCE เป็นเพียงการเครื่องมืออำนวยความสะดวก");
  });

  it("should throw error if fetching the SFX stub fails", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url === "/assets/sfx_stub.exe") {
        return { ok: false };
      }
      return { ok: true };
    });

    await expect(buildSfxArchive(options, uploadedFiles)).rejects.toThrow(
      "Failed to load SFX stub executable."
    );
  });
});
