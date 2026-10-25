package com.megarohas.amtv;

import java.net.URI;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/** Exact origins, shared by navigation, script injection and DRM permission checks. */
final class WebPolicy {
    private static final Set<String> PAGES = new HashSet<>(Arrays.asList(
            "music.apple.com", "idmsa.apple.com", "authorize.music.apple.com",
            "auth.music.apple.com", "appleid.apple.com", "account.apple.com", "activate.apple.com"));

    private static String host(String value) {
        try {
            URI uri = new URI(value);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getRawUserInfo() != null
                    || (uri.getPort() != -1 && uri.getPort() != 443)) return "";
            String host = uri.getHost();
            return host == null ? "" : host.toLowerCase(Locale.ROOT);
        } catch (Exception invalid) {
            return "";
        }
    }

    // Apple's account handoff uses a region-dependent numbered iTunes account server.
    private static boolean accountService(String host) {
        return "buy.itunes.apple.com".equals(host) || host.matches("p[0-9]{1,3}-buy\\.itunes\\.apple\\.com");
    }
    static boolean isNavigationAllowed(String value) {
        String host = host(value);
        return PAGES.contains(host) || accountService(host);
    }
    static boolean isMusic(String value) { return "music.apple.com".equals(host(value)); }
    static boolean isSignIn(String value) {
        String host = host(value);
        return "idmsa.apple.com".equals(host) || "authorize.music.apple.com".equals(host)
                || "activate.apple.com".equals(host) || accountService(host);
    }
}
