// src/app/components/SummaryLedgerModal.test.tsx
import { render, screen } from "@testing-library/react";
import { SummaryLedgerModal } from "./SummaryLedgerModal";
import type { EvidenceLedgerItem } from "./SummaryLedgerModal";

describe("SummaryLedgerModal", () => {
  const items: EvidenceLedgerItem[] = [
    {
      no: 1,
      date: "2024-01-01",
      time: "12:34",
      senderBank: "Bank A",
      senderName: "Alice",
      amount: 5000,
      receiverName: "Bob",
      receiverBank: "Bank B",
      memo: "Test payment",
      refId: "REF123",
      status: "สำเร็จ",
    },
    {
      no: 2,
      date: "2024-01-02",
      time: "13:45",
      senderBank: "Bank C",
      senderName: "Charlie",
      amount: "2500.00",
      receiverName: "David",
      receiverBank: "Bank D",
      memo: "",
      refId: "",
      status: "สำเร็จ",
    },
  ];

  test("renders items and total amount correctly", () => {
    render(
      <SummaryLedgerModal isOpen={true} onClose={() => {}} items={items} />
    );

    // Verify each sender name appears
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Charlie/)).toBeInTheDocument();

    // Verify total amount formatting (Thai locale adds commas)
    const totalRegex = /7,500\.00/;
    expect(screen.getByText(totalRegex)).toBeInTheDocument();
  });
});
