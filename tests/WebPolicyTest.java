package com.megarohas.amtv;

public final class WebPolicyTest {
    public static void main(String[] args) {
        String[] accepted = { "https://music.apple.com/mx/search", "https://idmsa.apple.com/appleauth/auth",
                "https://authorize.music.apple.com/", "https://auth.music.apple.com/auth/v2/web",
                "https://account.apple.com/", "https://appleid.apple.com/", "https://music.apple.com:443/",
                "https://MUSIC.APPLE.COM/", "https://activate.apple.com/",
                "https://p22-buy.itunes.apple.com/", "https://buy.itunes.apple.com/" };
        String[] rejected = { null, "", "http://music.apple.com/", "https://music.apple.com.evil.test/",
                "https://evilapple.com/", "https://evil.test/?next=https://music.apple.com/",
                "https://music.apple.com@evil.test/", "https://evil@music.apple.com/",
                "https://music.apple.com:444/", "https://music.apple.com./", "https://unlisted.apple.com/",
                "file:///etc/passwd", "content://music.apple.com/", "javascript:alert(1)",
                "intent://music.apple.com/", "data:text/html,hello", "https://music.apple.com\\@evil.test/",
                "https://p22-buy.itunes.apple.com.evil.test/", "https://p22-buy.evil.apple.com/",
                "https://evil-p22-buy.itunes.apple.com/", "http://p22-buy.itunes.apple.com/" };
        for (String url : accepted) if (!WebPolicy.isNavigationAllowed(url)) throw new AssertionError("Rejected " + url);
        for (String url : rejected) if (WebPolicy.isNavigationAllowed(url)) throw new AssertionError("Accepted " + url);
        if (!WebPolicy.isMusic(accepted[0]) || WebPolicy.isMusic(accepted[1])) throw new AssertionError("DRM/injection origin");
        if (!WebPolicy.isSignIn(accepted[1]) || !WebPolicy.isSignIn(accepted[2]) || WebPolicy.isSignIn(accepted[0])) throw new AssertionError("Login origin");
        if (!WebPolicy.isSignIn("https://activate.apple.com/") || WebPolicy.isSignIn("https://activate.apple.com.evil.test/")) throw new AssertionError("Shield activation origin");
        if (!WebPolicy.isSignIn("https://p22-buy.itunes.apple.com/")) throw new AssertionError("Account handoff origin");
        System.out.println("WebPolicy: 32 URL cases + DRM/login/activation boundaries passed");
    }
}
