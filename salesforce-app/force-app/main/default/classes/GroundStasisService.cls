/**
 * GroundStasisService
 *
 * Server-side Apex callout to the Ground Stasis REST API. Used by the
 * groundStasisPanel LWC to show the monitored site(s) that match a loan
 * record's loan number.
 *
 * Why Apex (not a browser fetch): the API key never reaches the browser, and
 * there is no CORS problem. The endpoint + key live in a Named Credential
 * called `Ground_Stasis` (see README) — no secret is ever hardcoded here, which
 * is also what the AppExchange security review expects.
 *
 * Integrity rule (mirrors the product): a DATA_GAP is missing evidence, never
 * "inactive." We pass the raw status through and label it honestly; we never
 * translate a gap into a claim about construction.
 */
public with sharing class GroundStasisService {

    /** What the LWC consumes (API snake_case mapped to camelCase). */
    public class SiteSummary {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public String address;
        @AuraEnabled public String status;        // ACTIVE | WATCH | REVIEW | STASIS | DATA_GAP
        @AuraEnabled public String statusLabel;   // human label for the badge
        @AuraEnabled public Integer stasisScore;
        @AuraEnabled public String confidence;    // HIGH | MEDIUM | LOW
        @AuraEnabled public String lastEvaluatedAt;
    }

    /**
     * Sites whose loan number matches `loanNumber`, for the authenticated key's
     * account. Returns an empty list for a blank loan number. Throws an
     * AuraHandledException (surfaced to the LWC) on rate limit or API error.
     */
    @AuraEnabled(cacheable=true)
    public static List<SiteSummary> getSitesByLoanNumber(String loanNumber) {
        List<SiteSummary> results = new List<SiteSummary>();
        if (String.isBlank(loanNumber)) {
            return results;
        }

        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:Ground_Stasis/sites?loan_number='
            + EncodingUtil.urlEncode(loanNumber, 'UTF-8'));
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json');
        req.setTimeout(20000);

        HttpResponse res = new Http().send(req);
        Integer code = res.getStatusCode();

        if (code == 429) {
            throw new AuraHandledException(
                'Ground Stasis rate limit reached. Please try again in a minute.');
        }
        if (code < 200 || code >= 300) {
            throw new AuraHandledException('Ground Stasis API error (HTTP ' + code + ').');
        }

        Map<String, Object> body =
            (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
        Object dataObj = body.get('data');
        if (dataObj instanceof List<Object>) {
            for (Object item : (List<Object>) dataObj) {
                Map<String, Object> m = (Map<String, Object>) item;
                SiteSummary s = new SiteSummary();
                s.id = asString(m.get('id'));
                s.name = asString(m.get('name'));
                s.address = asString(m.get('address'));
                s.status = asString(m.get('status'));
                s.statusLabel = statusLabel(s.status);
                s.stasisScore = asInteger(m.get('stasis_score'));
                s.confidence = asString(m.get('confidence'));
                s.lastEvaluatedAt = asString(m.get('last_evaluated_at'));
                results.add(s);
            }
        }
        return results;
    }

    private static String asString(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private static Integer asInteger(Object v) {
        if (v == null) return null;
        if (v instanceof Integer) return (Integer) v;
        if (v instanceof Long) return ((Long) v).intValue();
        if (v instanceof Decimal) return ((Decimal) v).intValue();
        if (v instanceof Double) return ((Double) v).intValue();
        try { return Integer.valueOf(String.valueOf(v)); } catch (Exception e) { return null; }
    }

    private static String statusLabel(String status) {
        if (status == 'ACTIVE') return 'Active';
        if (status == 'WATCH') return 'Watch';
        if (status == 'REVIEW') return 'Review';
        if (status == 'STASIS') return 'Stasis';
        if (status == 'DATA_GAP') return 'Data gap';
        return status;
    }
}
