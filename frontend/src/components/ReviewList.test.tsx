import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewList } from "@/components/ReviewList";
import { readContract } from "@/lib/contracts";

vi.mock("@/lib/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/contracts")>()),
  readContract: vi.fn(),
}));

const AGENT = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const mockedRead = vi.mocked(readContract);

/** getReviews returns parallel arrays, not structs. */
function page(entries: { rating: number; comment: string }[]) {
  return [
    entries.map((_, index) => BigInt(index + 1)),
    entries.map(() => "0x1111111111111111111111111111111111111111"),
    entries.map((entry) => entry.rating),
    entries.map((entry) => entry.comment),
    entries.map(() => BigInt(7)),
    entries.map(() => BigInt(1_700_000_000)),
  ];
}

describe("ReviewList", () => {
  beforeEach(() => {
    mockedRead.mockReset();
  });

  it("explains the empty state instead of rendering nothing", async () => {
    mockedRead.mockResolvedValueOnce(BigInt(0) as never);

    render(<ReviewList agent={AGENT} />);

    expect(await screen.findByText(/no reviews yet/i)).toBeInTheDocument();
  });

  it("renders each review with its rating and comment", async () => {
    mockedRead
      .mockResolvedValueOnce(BigInt(2) as never)
      .mockResolvedValueOnce(
        page([
          { rating: 5, comment: "Exactly as specified." },
          { rating: 3, comment: "Late but usable." },
        ]) as never,
      );

    render(<ReviewList agent={AGENT} />);

    expect(
      await screen.findByText("Exactly as specified."),
    ).toBeInTheDocument();
    expect(screen.getByText("Late but usable.")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "5 out of 5 stars" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "3 out of 5 stars" }),
    ).toBeInTheDocument();
  });

  it("marks a rating left without a comment", async () => {
    mockedRead
      .mockResolvedValueOnce(BigInt(1) as never)
      .mockResolvedValueOnce(page([{ rating: 4, comment: "" }]) as never);

    render(<ReviewList agent={AGENT} />);

    expect(
      await screen.findByText(/rated without a comment/i),
    ).toBeInTheDocument();
  });

  it("offers to load older reviews only when some remain", async () => {
    mockedRead
      .mockResolvedValueOnce(BigInt(7) as never)
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 5 }, (_, index) => ({
            rating: 5,
            comment: `review ${index}`,
          })),
        ) as never,
      );

    render(<ReviewList agent={AGENT} />);

    expect(
      await screen.findByRole("button", { name: /load older reviews \(2 left\)/i }),
    ).toBeInTheDocument();
  });

  it("surfaces a read failure rather than an empty list", async () => {
    mockedRead.mockRejectedValueOnce(new Error("request limit reached"));

    render(<ReviewList agent={AGENT} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /rate-limiting/i,
    );
  });
});
