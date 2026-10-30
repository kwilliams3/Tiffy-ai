package com.kwilliams.tiffy;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TiffyUpdates")
public class TiffyUpdatesPlugin extends Plugin {
    @PluginMethod
    public void version(PluginCall call) {
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            JSObject value = new JSObject();
            value.put("code", androidx.core.content.pm.PackageInfoCompat.getLongVersionCode(info));
            value.put("name", info.versionName);
            call.resolve(value);
        } catch (Exception error) { call.reject("Impossible de lire la version installée."); }
    }
    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url", "");
        if (!url.matches("https://github\\.com/kwilliams3/Tiffy-ai/releases/download/android-[0-9]+/Tiffy\\.apk")) {
            call.reject("Lien de mise à jour invalide."); return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) { call.reject("Aucun navigateur disponible pour télécharger l’APK."); }
    }
}
