import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ReviewPanel } from "@/components/ReviewPanel";
import { useWalletStore } from "@/lib/store";
import { arcTestnet, readContract } from "@/lib/contracts";

vi.mock("@/lib/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/contracts")>()),
  readContract: vi.fn(),
}));

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const mockedRead = vi.mocked(readContract);

function connect() {
  useWalletStore.getState().setConnected(ADDRESS, arcTestnet.id, {
    request: vi.fn(),
  });
}

describe("ReviewPanel", () => {
  beforeEach(() => {
    mockedRead.mockReset();
    // Not reviewed yet unless a test says otherwise.
    mockedRead.mockResolvedValue(false as never);
    useWalletStore.getState().setDisconnected();
  });

  it("renders nothing until the task is paid", () => {
    connect();
    const { container } = render(
      <ReviewPanel
        taskId="1"
        isParty
        taskPaid={false}
        counterpartyLabel="the provider's"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a wallet that is not a party to the task", () => {
    connect();
    const { container } = render(
      <ReviewPanel
        taskId="1"
        isParty={false}
        taskPaid
        counterpartyLabel="the provider's"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no wallet is connected", () => {
    const { container } = render(
      <ReviewPanel
        taskId="1"
        isParty
        taskPaid
        counterpartyLabel="the provider's"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("offers the form to a party on a paid task", async () => {
    connect();
    render(
      <ReviewPanel
        taskId="1"
        isParty
        taskPaid
        counterpartyLabel="the provider's"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Rate this task" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Rating" })).toBeInTheDocument();
  });

  it("keeps submit disabled until a rating is picked", async () => {
    connect();
    render(
      <ReviewPanel
        taskId="1"
        isParty
        taskPaid
        counterpartyLabel="the provider's"
      />,
    );

    const submit = await screen.findByRole("button", {
      name: /submit review/i,
    });
    expect(submit).toBeDisabled();
  });

  it("replaces the form once the wallet has already reviewed", async () => {
    connect();
    mockedRead.mockResolvedValue(true as never);

    render(
      <ReviewPanel
        taskId="1"
        isParty
        taskPaid
        counterpartyLabel="the provider's"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Review submitted" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("radiogroup", { name: "Rating" }),
    ).not.toBeInTheDocument();
  });

  it("still offers the form when the reviewed check fails", async () => {
    connect();
    mockedRead.mockRejectedValue(new Error("request limit reached"));

    render(
      <ReviewPanel
        taskId="1"
        isParty
        taskPaid
        counterpartyLabel="the provider's"
      />,
    );

    // The contract is the real gate; a failed read must not hide the form.
    expect(
      await screen.findByRole("heading", { name: "Rate this task" }),
    ).toBeInTheDocument();
  });
});
