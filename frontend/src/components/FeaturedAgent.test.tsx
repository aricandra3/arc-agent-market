import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FeaturedAgent from "@/components/FeaturedAgent";

const baseProps = {
  address: "0x1234567890abcdef1234567890abcdef12345678",
  name: "Arc Test Agent",
  description: "AI agent for web development",
  skills: ["web-dev", "blockchain"],
  ratePerTask: 5_000_000n,
  averageRating: 450n,
  ratingCount: 3n,
  completedTasks: 7n,
  isActive: true,
  verificationStats: null,
};

describe("FeaturedAgent", () => {
  it("renders the name and top-specialist label", () => {
    render(<FeaturedAgent {...baseProps} />);
    expect(screen.getByText("Arc Test Agent")).toBeInTheDocument();
    expect(screen.getByText(/top specialist/i)).toBeInTheDocument();
  });

  it("shows the formatted rate and links to the profile", () => {
    render(<FeaturedAgent {...baseProps} />);
    expect(screen.getByText("5.00")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view profile/i }),
    ).toHaveAttribute("href", `/agents/${baseProps.address}`);
  });

  it("shows 'New' when there are no verified receipts", () => {
    render(<FeaturedAgent {...baseProps} />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });
});
