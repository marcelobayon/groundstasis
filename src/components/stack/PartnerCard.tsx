"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import type { StackPartner } from "@/config/affiliates";

const ORANGE = "#FF6B00";
const NAVY = "#0A192F";

export function PartnerCard({
  partner,
  categorySlug,
}: {
  partner: StackPartner;
  categorySlug: string;
}) {
  const isGs = Boolean(partner.isGroundStasis);
  const href = isGs ? partner.internalHref : partner.affiliateUrl || partner.officialUrl;
  const isAffiliate = !isGs && Boolean(partner.affiliateUrl);
  const hasLink = Boolean(href);

  function onClick() {
    if (isGs) {
      track("ground_stasis_conversion_click", {
        partner_id: partner.id,
        category: categorySlug,
        cta_type: "internal",
      });
    } else {
      track("partner_outbound_click", {
        partner_id: partner.id,
        category: categorySlug,
        relationship_type: partner.relationshipType,
        cta_type: isAffiliate ? "affiliate" : "official",
      });
    }
  }

  const tag = isGs
    ? { text: "Ground Stasis", color: ORANGE }
    : isAffiliate
      ? { text: "Affiliate link", color: "#64748B" }
      : { text: "Resource", color: "#94A3B8" };

  return (
    <div
      style={{
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: 18,
        marginBottom: 12,
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <strong style={{ fontSize: 17, color: NAVY }}>{partner.name}</strong>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: tag.color,
            whiteSpace: "nowrap",
          }}
        >
          {tag.text}
        </span>
      </div>
      <p className="small muted" style={{ margin: "7px 0 4px", color: "#334155" }}>
        {partner.description}
      </p>
      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 14px" }}>
        Best for: {partner.bestFor}
      </p>

      {!hasLink ? (
        <span style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>
          Partnership details pending
        </span>
      ) : isGs ? (
        <Link
          href={href as string}
          onClick={onClick}
          style={{
            display: "inline-block",
            background: ORANGE,
            color: "#fff",
            padding: "9px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          {partner.ctaLabel}
        </Link>
      ) : (
        <a
          href={href as string}
          onClick={onClick}
          target="_blank"
          rel={isAffiliate ? "sponsored nofollow noopener noreferrer" : "noopener noreferrer"}
          style={{
            display: "inline-block",
            border: `1px solid ${NAVY}`,
            color: NAVY,
            padding: "8px 15px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          {partner.ctaLabel} ↗
        </a>
      )}
    </div>
  );
}
