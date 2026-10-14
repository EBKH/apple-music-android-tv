PKG       := com.megarohas.amtv
SDK       ?= $(HOME)/Library/Android/sdk
BT        ?= $(SDK)/build-tools/36.0.0
PLATFORM  ?= $(SDK)/platforms/android-36/android.jar
KEYSTORE  ?= $(HOME)/.android/debug.keystore
JAVA_HOME ?= $(shell /usr/libexec/java_home -v 17)
export JAVA_HOME
export PATH := $(JAVA_HOME)/bin:$(PATH)

# The TV box over adb: `make install TV=192.168.1.50:5555`, or put `TV = …` in local.mk (git-ignored)
-include local.mk
TV  ?=
ADB := adb $(if $(TV),-s $(TV))

B   := build
APK := $(B)/amtv.apk
SRC := $(shell find src -name '*.java')
RES := $(shell find res -type f)
ASSETS := $(shell find assets -type f)

.PHONY: all install start stop devtools log clean

all: $(APK)

# No Gradle: aapt2 → javac → d8 → zipalign → apksigner, a few seconds end to end.
$(APK): AndroidManifest.xml $(SRC) $(RES) $(ASSETS)
	rm -rf $(B) && mkdir -p $(B)/classes
	$(BT)/aapt2 compile --dir res -o $(B)/res.zip
	$(BT)/aapt2 link -I $(PLATFORM) --manifest AndroidManifest.xml -A assets -o $(B)/app.unsigned.apk $(B)/res.zip
	javac -source 8 -target 8 -Xlint:-options -encoding UTF-8 -bootclasspath $(PLATFORM):$(BT)/core-lambda-stubs.jar -d $(B)/classes $(SRC)
	$(BT)/d8 --release --min-api 29 --lib $(PLATFORM) --output $(B) $$(find $(B)/classes -name '*.class')
	cd $(B) && zip -q app.unsigned.apk classes.dex
	$(BT)/zipalign -f -p 4 $(B)/app.unsigned.apk $(B)/app.aligned.apk
	$(BT)/apksigner sign --ks $(KEYSTORE) --ks-pass pass:android --ks-key-alias androiddebugkey \
		--key-pass pass:android --out $@ $(B)/app.aligned.apk
	@ls -lh $@

install: $(APK)
	$(ADB) install -r $(APK)

start:
	$(ADB) shell am start -n $(PKG)/.MainActivity

stop:
	$(ADB) shell am force-stop $(PKG)

# Chrome DevTools for the app's WebView on localhost:9222 (chrome://inspect or tools/cdp.mjs)
devtools:
	@pid=$$($(ADB) shell pidof $(PKG)); test -n "$$pid" || { echo "app is not running"; exit 1; }; \
	$(ADB) forward tcp:9222 localabstract:webview_devtools_remote_$$pid && echo "http://localhost:9222/json"

log:
	$(ADB) logcat -s amtv chromium

clean:
	rm -rf $(B)
