import { promises as fs } from "node:fs";
import type { TestInfo } from "playwright/test";

function chatSvg(height: number, label: string) {
  const bubbles = Array.from({ length: 18 }, (_, index) => {
    const y = 72 + index * 84;
    const isRight = index % 2 === 0;
    const x = isRight ? 300 : 48;
    const fill = isRight ? "#d8f7c7" : "#ffffff";
    return `
      <rect x="${x}" y="${y}" width="360" height="56" rx="18" fill="${fill}" stroke="#9ca3af" />
      <text x="${x + 22}" y="${y + 35}" fill="#111827" font-family="Arial" font-size="22">${label} message ${index + 1}</text>
    `;
  }).join("\n");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="${height}" viewBox="0 0 720 ${height}">
      <rect width="720" height="${height}" fill="#e5f2e7" />
      <text x="48" y="42" fill="#374151" font-family="Arial" font-size="24">${label}</text>
      ${bubbles}
    </svg>
  `;
}

export async function createChatFixture(testInfo: TestInfo, name: string, label: string) {
  const filePath = testInfo.outputPath(name);
  await fs.writeFile(filePath, chatSvg(1680, label), "utf8");
  return filePath;
}

export async function uploadChatFixtures(testInfo: TestInfo) {
  return [
    await createChatFixture(testInfo, "chat-acceptance-1.svg", "Chat A"),
    await createChatFixture(testInfo, "chat-acceptance-2.svg", "Chat B"),
  ];
}
