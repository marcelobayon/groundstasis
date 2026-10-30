/**
 * Tests for GroundStasisService. Uses HttpCalloutMock (no live callout), covers
 * the success parse, the blank-input short-circuit, and the rate-limit / error
 * paths. Keeps coverage above the 75% the deploy + security review require.
 */
@isTest
private class GroundStasisServiceTest {

    private class GsMock implements HttpCalloutMock {
        private Integer code;
        private String body;
        private GsMock(Integer code, String body) {
            this.code = code;
            this.body = body;
        }
        public HttpResponse respond(HttpRequest req) {
            // Sanity: the callout must target the Named Credential + path.
            System.assert(
                req.getEndpoint().startsWith('callout:Ground_Stasis/sites?loan_number='),
                'Unexpected endpoint: ' + req.getEndpoint());
            HttpResponse res = new HttpResponse();
            res.setStatusCode(code);
            res.setHeader('Content-Type', 'application/json');
            res.setBody(body);
            return res;
        }
    }

    @isTest
    static void returnsAndLabelsSites() {
        String body = '{"data":[' +
            '{"id":"s1","name":"Maple St","address":"1 Maple","status":"STASIS",' +
            '"stasis_score":82,"confidence":"HIGH","last_evaluated_at":"2026-10-20T00:00:00Z"},' +
            '{"id":"s2","name":"Oak Ave","address":null,"status":"DATA_GAP",' +
            '"stasis_score":0,"confidence":"LOW","last_evaluated_at":null}]}';
        Test.setMock(HttpCalloutMock.class, new GsMock(200, body));

        Test.startTest();
        List<GroundStasisService.SiteSummary> sites =
            GroundStasisService.getSitesByLoanNumber('LN-100');
        Test.stopTest();

        System.assertEquals(2, sites.size(), 'both sites parsed');
        System.assertEquals('STASIS', sites[0].status);
        System.assertEquals('Stasis', sites[0].statusLabel);
        System.assertEquals(82, sites[0].stasisScore);
        System.assertEquals('HIGH', sites[0].confidence);
        // Integrity: a data gap is labeled as a gap, never "inactive".
        System.assertEquals('Data gap', sites[1].statusLabel);
        System.assertEquals(null, sites[1].address);
    }

    @isTest
    static void blankLoanNumberShortCircuits() {
        // No mock set — a callout here would fail the test, proving we never call.
        List<GroundStasisService.SiteSummary> sites =
            GroundStasisService.getSitesByLoanNumber('   ');
        System.assertEquals(0, sites.size());
    }

    @isTest
    static void rateLimitSurfaces() {
        Test.setMock(HttpCalloutMock.class,
            new GsMock(429, '{"error":{"code":"rate_limited","message":"slow down"}}'));
        Test.startTest();
        Boolean threw = false;
        try {
            GroundStasisService.getSitesByLoanNumber('LN-1');
        } catch (AuraHandledException e) {
            threw = true;
        }
        Test.stopTest();
        System.assert(threw, 'rate limit should raise an AuraHandledException');
    }

    @isTest
    static void apiErrorSurfaces() {
        Test.setMock(HttpCalloutMock.class, new GsMock(500, 'internal error'));
        Test.startTest();
        Boolean threw = false;
        try {
            GroundStasisService.getSitesByLoanNumber('LN-2');
        } catch (AuraHandledException e) {
            threw = true;
        }
        Test.stopTest();
        System.assert(threw, 'a 5xx should raise an AuraHandledException');
    }

    @isTest
    static void emptyDataReturnsEmptyList() {
        Test.setMock(HttpCalloutMock.class, new GsMock(200, '{"data":[]}'));
        Test.startTest();
        List<GroundStasisService.SiteSummary> sites =
            GroundStasisService.getSitesByLoanNumber('LN-3');
        Test.stopTest();
        System.assertEquals(0, sites.size());
    }
}
