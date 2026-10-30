// Affiliate disclosure shown wherever monetized recommendations appear.
// Kept visible but unobtrusive, per the brand's candor rules.
export function AffiliateDisclosure() {
  return (
    <p
      className="small muted"
      style={{ marginTop: 20, fontSize: 12, lineHeight: 1.6, color: "#64748B" }}
    >
      <strong>Disclosure:</strong> some links in this directory are affiliate or
      referral links, clearly labeled where they appear. If you use one, Ground
      Stasis may earn a commission at no extra cost to you. This never affects a
      site&rsquo;s reported monitoring status, score, confidence, or
      interpretation — the directory is kept editorially independent from the
      monitoring engine.
    </p>
  );
}
