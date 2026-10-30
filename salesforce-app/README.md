# Ground Stasis — Salesforce app (`salesforce-app/`)

Pilot (unmanaged) Salesforce DX project: a Lightning Web Component on a loan /
opportunity record page that shows the matching Ground Stasis monitored site(s)
— status, stasis score, confidence, last evaluated — via a server-side Apex
callout to the Ground Stasis REST API, authenticated through a **Named
Credential**. No secret is stored in this repo; the API key is entered once in
Salesforce Setup.

**What's here**

```
force-app/main/default/
  classes/GroundStasisService.cls(+Test)   Apex callout + JSON parse (+ unit tests, mocked)
  lwc/groundStasisPanel/                    the record-page component
  permissionsets/Ground_Stasis_User        grants Apex access
sfdx-project.json  .forceignore  config/   DX project config
```

Data flows **one way**: Ground Stasis data is shown inside Salesforce. Nothing
from Salesforce is sent to Ground Stasis except the loan number being looked up.

---

## Prerequisites

- Salesforce CLI (`sf`) installed and the org authorized. You already did this:
  `sf org list` shows `marcelo.bayon1987@gmail.com` (org `00DkP…`).
- A Ground Stasis **API key with the `sites:read` scope** — mint one at
  `https://groundstasis.com/account` (API keys section). Copy it now; it's shown once.

Run everything below from **inside the `salesforce-app/` folder**. Replace the
`-o` value with your org username if different.

---

## Step 1 — Deploy the code

```powershell
cd salesforce-app
sf project deploy start -o marcelo.bayon1987@gmail.com
```

This deploys the Apex, the LWC, and the permission set. The Apex compiles even
though the Named Credential doesn't exist yet (the callout name is resolved at
runtime). Expect "Deploy Succeeded."

## Step 2 — Run the Apex tests

```powershell
sf apex run test -o marcelo.bayon1987@gmail.com -l RunLocalTests -w 10 -c -r human
```

`GroundStasisServiceTest` is fully mocked (no live callout) and should pass with
100% coverage of the service class.

## Step 3 — Create the External Credential (holds the API key)

Setup → **Named Credentials** → **External Credentials** tab → **New**:

- Label: `Ground Stasis` · Name: `Ground_Stasis_EC` · Authentication Protocol: **Custom** → Save.
- **Principals** → New: Parameter Name `GroundStasisPrincipal`, Sequence `1`,
  Identity Type **Named Principal** → Save. Then on that principal add an
  **Authentication Parameter**: Name `ApiKey`, Value = *paste your `gs_live_…` key* → Save.
  (This is where the secret lives — encrypted in the org, never in the repo.)
- **Custom Headers** → New: Name `x-api-key`, Value = the merge field for the key.
  Use the field picker / enter `{!$Credential.Ground_Stasis_EC.ApiKey}`.
  (The Ground Stasis API accepts the raw key in `x-api-key`, so no "Bearer " prefix is needed.)

## Step 4 — Create the Named Credential (the callout target)

Setup → **Named Credentials** → **Named Credentials** tab → **New**:

- Label: `Ground Stasis` · Name: **`Ground_Stasis`**  ← must match exactly (the Apex uses `callout:Ground_Stasis`).
- URL: `https://groundstasis.com/api/v1`
- External Credential: **Ground Stasis** (the one from Step 3).
- Check **Allow Formulas in HTTP Header** (required for the `x-api-key` merge field).
- Leave **Generate Authorization Header** unchecked (we supply our own header).
- Save.

## Step 5 — Grant access

- Assign the **Ground Stasis User** permission set to yourself:
  `sf org assign permset -n Ground_Stasis_User -o marcelo.bayon1987@gmail.com`
- Grant that permission set access to the credential: Setup → Permission Sets →
  **Ground Stasis User** → **External Credential Principal Access** → Enable
  `Ground_Stasis_EC - GroundStasisPrincipal`. (Without this the callout returns a
  "no access to the external credential" error.)

## Step 6 — Put the component on a record page

1. Open a record of the object your loans live on (Opportunity, or a custom
   `Loan__c`, etc.). → gear → **Edit Page**.
2. Drag **Ground Stasis Site Activity** onto the page.
3. In its settings, set **Loan Number Field API Name** to the field that holds
   the loan number, e.g. `Loan_Number__c` (or `Name` on a custom loan object).
4. Save & Activate. Open a record whose loan number matches a monitored site —
   the panel shows its status; a non-match shows "No monitored site matches."

---

## Notes

- **Integrity rule:** the panel labels a `DATA_GAP` as "Data gap" and never as
  "inactive." Keep that if you edit the copy — it's a product trust rule.
- **Security-review prep (for the future managed/AppExchange path):** the callout
  uses a Named Credential (no hardcoded secret/endpoint), Apex is `with sharing`
  with ≥75% coverage, and it does no SOQL/DML (nothing to injection- or
  CRUD/FLS-audit). The `x-api-key` key is admin-entered, not packaged.
- **Rate limits:** a 429 from the API surfaces as a friendly "try again" message.
- **Phase 2 (later):** replace the pasted API key with an OAuth 2.0 connected app
  so each Salesforce user authorizes Ground Stasis without handling a raw key —
  see `claude/salesforce-integration.md` in the project.

## Troubleshooting

- *"Unauthorized endpoint" / callout not allowed* — the Named Credential name
  isn't exactly `Ground_Stasis`, or Step 4 wasn't saved.
- *"No access to the external credential"* — Step 5 principal access not granted.
- *401 from the API* — the `ApiKey` value is wrong or lacks the `sites:read` scope.
- *Panel says "Set the Loan Number Field…"* — the component property in Step 6 is empty.
- *Empty panel on a known loan* — the loan number on the record doesn't match a
  site's `loan_number` in Ground Stasis.
