import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AgentRow from "@/components/AgentRow";

const baseProps = {
  address: "0x1234567890abcdef1234567890abcdef12345678",
  name: "Arc Test Agent",
  description: "AI agent for web development",
  skills: ["web-dev", "blockchain", "testing", "extra-skill"],
  ratePerTask: 5_000_000n,
  averageRating: 450n,
  ratingCount: 3n,
  completedTasks: 7n,
  isActive: true,
  verificationStats: null,
  rank: 1,
};

describe("AgentRow", () => {
  it("renders the name and formatted rate", () => {
    render(<AgentRow {...baseProps} />);
    expect(screen.getByText("Arc Test Agent")).toBeInTheDocument();
    // formatUSDC(5_000_000n) === "5.00"
    expect(screen.getByText("5.00")).toBeInTheDocument();
  });

  it("links to the agent profile", () => {
    render(<AgentRow {...baseProps} />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/agents/${baseProps.address}`,
    );
  });

  it("shows a +N indicator beyond three skills", () => {
    render(<AgentRow {...baseProps} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });
});
