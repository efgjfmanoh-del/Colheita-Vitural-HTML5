package br.com.colheitavitural.html5.qa;
import android.app.*;
import android.content.*;
import android.content.pm.*;
import android.database.Cursor;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.view.Gravity;
import android.widget.*;
import androidx.core.content.FileProvider;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.*;

final class UpdateCenter {
    static final String REPO="efgjfmanoh-del/Colheita-Vitural-HTML5";
    static final String API="https://api.github.com/repos/"+REPO+"/releases?per_page=20";
    static final String BASE="https://github.com/"+REPO+"/releases/download/";
    static final String APK="ColheitaVitural-QA.apk";
    static final String CERT="fdefa3921fb2e0010e5f4a677589a7f8f8a450738626caab4c97dc7ad25f6f21";
    static final long MAX=512L*1024*1024;
    final Activity a; final DownloadManager dm; final SharedPreferences prefs;
    final Handler handler=new Handler(Looper.getMainLooper());
    final ExecutorService worker=Executors.newSingleThreadExecutor();
    final Button badge; final long installed; final String installedName; final SharedPreferences history;
    boolean showReport=false; long downloadedBytes=0;
    long id=-1,checkedAt=0; Info info;
    boolean alive=true,active=false,checking=false,verifying=false,verified=false;
    int progress=0; String status="Verificar novas versões";
    AlertDialog dialog; TextView detail; ProgressBar bar; Button checkButton,downloadButton,installButton,cancelButton;
    final Runnable tick=new Runnable(){public void run(){if(!alive||!active)return;poll();if(id<0&&!verified&&!checking&&System.currentTimeMillis()-checkedAt>300000)check();handler.postDelayed(this,1000);}};

    static final class Info {
        final long code,size; final String name,hash,tag;
        Info(JSONObject j,String t)throws Exception {
            code=j.getLong("versionCode");size=j.getLong("size");name=j.getString("versionName");
            hash=j.getString("sha256").toLowerCase(Locale.ROOT);tag=t;
            if(code<109||code>Integer.MAX_VALUE||!tag.equals("qa-v"+code)||size<=0||size>MAX||
                !hash.matches("[0-9a-f]{64}")||!name.matches("[0-9]+\\.[0-9]+\\.[0-9]+")||
                !APK.equals(j.getString("file"))||!"br.com.colheitavitural.html5.qa".equals(j.getString("package"))||
                !CERT.equals(j.getString("certificateSha256")))throw new SecurityException("Manifesto inválido");
        }
        String url(){return BASE+tag+"/"+APK;}
        JSONObject json()throws Exception{return new JSONObject().put("versionCode",code).put("size",size).put("versionName",name)
            .put("sha256",hash).put("file",APK).put("package","br.com.colheitavitural.html5.qa").put("certificateSha256",CERT).put("tag",tag);}
    }
    UpdateCenter(Activity a,FrameLayout root){
        this.a=a;dm=(DownloadManager)a.getSystemService(Context.DOWNLOAD_SERVICE);prefs=a.getSharedPreferences("cv_qa_updater",Context.MODE_PRIVATE);
        long local=0;String localName="desconhecida";try{PackageInfo p=a.getPackageManager().getPackageInfo(a.getPackageName(),0);local=Build.VERSION.SDK_INT>=28?p.getLongVersionCode():p.versionCode;localName=p.versionName;}catch(Exception ignored){}
        installed=local;installedName=localName;
        history=a.getSharedPreferences("cv_qa_version_history",Context.MODE_PRIVATE);
        showReport=installed>=110&&history.getLong("seenVersion",0)<installed;
        if(installed<110)history.edit().putLong("seenVersion",installed).apply();
        try{JSONObject j=new JSONObject(prefs.getString("info","{}"));Info saved=new Info(j,j.getString("tag"));long savedId=prefs.getLong("id",-1);
            if(saved.code>installed){info=saved;id=savedId;}else if(savedId>=0){dm.remove(savedId);prefs.edit().clear().apply();}
        }catch(Exception ignored){prefs.edit().clear().apply();}
        badge=new Button(a);badge.setAllCaps(false);badge.setTextColor(0xfff5efd8);badge.setTextSize(12);
        GradientDrawable bg=new GradientDrawable();bg.setColor(0xe6213525);bg.setCornerRadius(dp(10));bg.setStroke(dp(1),0xff93a779);
        badge.setBackground(bg);badge.setMinHeight(dp(36));badge.setPadding(dp(10),0,dp(10),0);
        FrameLayout.LayoutParams lp=new FrameLayout.LayoutParams(-2,dp(38),Gravity.TOP|Gravity.LEFT);lp.setMargins(dp(12),dp(10),0,0);root.addView(badge,lp);
        badge.setOnClickListener(v->show());refresh();
    }
    int dp(int v){return Math.round(v*a.getResources().getDisplayMetrics().density);}
    void resume(){if(!alive)return;active=true;handler.removeCallbacks(tick);handler.post(tick);if(System.currentTimeMillis()-checkedAt>300000&&id<0&&!verified)check();}
    void pause(){active=false;handler.removeCallbacks(tick);}
    void close(){alive=false;pause();worker.shutdownNow();if(dialog!=null)dialog.dismiss();}
    void ui(Runnable r){handler.post(()->{if(alive)r.run();});}
    static boolean trusted(URL u){String h=u.getHost().toLowerCase(Locale.ROOT);return "https".equals(u.getProtocol())&&(h.equals("api.github.com")||h.equals("github.com")||h.equals("release-assets.githubusercontent.com")||h.equals("objects.githubusercontent.com"));}
    static String fetch(String address,int max)throws Exception{
        URL u=new URL(address);
        for(int n=0;n<6;n++){
            if(!trusted(u))throw new SecurityException("Origem não permitida");
            HttpURLConnection c=(HttpURLConnection)u.openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(12000);c.setReadTimeout(16000);
            c.setRequestProperty("User-Agent","ColheitaVitural-QA");c.setRequestProperty("Accept","application/json");
            try{int code=c.getResponseCode();
                if(code>=300&&code<400){String to=c.getHeaderField("Location");if(to==null)throw new IOException("Redirect");u=new URL(u,to);continue;}
                if(code!=200)throw new IOException("HTTP "+code);
                try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
                    byte[] b=new byte[8192];int k;while((k=in.read(b))!=-1){if(out.size()+k>max)throw new IOException("Resposta grande");out.write(b,0,k);}
                    return new String(out.toByteArray(),StandardCharsets.UTF_8);
                }
            }finally{c.disconnect();}
        }throw new IOException("Redirecionamentos excessivos");
    }
    void check(){
        if(checking||id>=0||verified||!alive)return;checking=true;status="Consultando canal de testes…";refresh();
        worker.execute(()->{try{
            JSONArray releases=new JSONArray(fetch(API,2*1024*1024));long best=installed;String tag=null;
            for(int i=0;i<releases.length();i++){JSONObject r=releases.getJSONObject(i);String t=r.optString("tag_name");
                if(r.optBoolean("draft")||!r.optBoolean("prerelease")||!t.matches("qa-v[0-9]{3,10}"))continue;
                long code=Long.parseLong(t.substring(4));if(code<=best||code>Integer.MAX_VALUE)continue;
                JSONArray assets=r.optJSONArray("assets");boolean manifest=false,apk=false;
                if(assets!=null)for(int j=0;j<assets.length();j++){JSONObject z=assets.getJSONObject(j);if(!"uploaded".equals(z.optString("state")))continue;manifest|="update.json".equals(z.optString("name"));apk|=APK.equals(z.optString("name"));}
                if(manifest&&apk){best=code;tag=t;}
            }
            Info result=tag==null?null:new Info(new JSONObject(fetch(BASE+tag+"/update.json",65536)),tag);
            ui(()->{checking=false;checkedAt=System.currentTimeMillis();info=result;status=result==null?"Você já está atualizado":"Nova versão "+result.name+" disponível";refresh();});
        }catch(Exception e){ui(()->{checking=false;checkedAt=System.currentTimeMillis();status="Sem conexão com o canal. Tente novamente.";refresh();});}});
    }
    File file(Info v){File dir=a.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);if(dir==null)throw new IllegalStateException("Armazenamento indisponível");return new File(dir,"qa-updates/qa-"+v.code+".apk");}
    void start(){
        if(info==null||info.code<=installed||id>=0||verifying||verified||checking)return;
        try{File f=file(info);if(!f.getParentFile().isDirectory()&&!f.getParentFile().mkdirs())throw new IOException("Pasta");
            if(f.exists()&&!f.delete())throw new IOException("Arquivo anterior");
            DownloadManager.Request r=new DownloadManager.Request(Uri.parse(info.url()));r.setTitle("Colheita Vitural "+info.name);r.setDescription("Atualização experimental");
            r.setMimeType("application/vnd.android.package-archive");r.setAllowedOverMetered(true);r.setAllowedOverRoaming(false);
            r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            r.setDestinationInExternalFilesDir(a,Environment.DIRECTORY_DOWNLOADS,"qa-updates/qa-"+info.code+".apk");
            id=dm.enqueue(r);prefs.edit().putLong("id",id).putString("info",info.json().toString()).apply();
            downloadedBytes=0;progress=0;status="Baixando em segundo plano";refresh();
        }catch(Exception e){status="Não foi possível iniciar. Tente novamente.";refresh();}
    }
    void clearDownload(String message){if(id>=0)dm.remove(id);id=-1;verified=false;verifying=false;progress=0;downloadedBytes=0;prefs.edit().clear().apply();status=message;refresh();}
    void poll(){
        if(id<0||info==null||verified||verifying)return;
        try(Cursor c=dm.query(new DownloadManager.Query().setFilterById(id))){
            if(c==null||!c.moveToFirst()){clearDownload("Download interrompido. Tente novamente.");return;}
            long bytes=c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));int state=c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            downloadedBytes=Math.max(0,bytes);progress=(int)Math.max(0,Math.min(100,100*bytes/Math.max(1,info.size)));
            if(bytes>info.size){clearDownload("Arquivo excedeu o tamanho esperado.");return;}
            if(state==DownloadManager.STATUS_SUCCESSFUL){verifyAsync();return;}
            if(state==DownloadManager.STATUS_FAILED){clearDownload("Download falhou. Tente novamente.");return;}
            status=state==DownloadManager.STATUS_PAUSED?"Download pausado. O Android tentará retomar.":state==DownloadManager.STATUS_PENDING?"Aguardando conexão":"Baixando em segundo plano";refresh();
        }catch(Exception e){status="Aguardando serviço de download";refresh();}
    }
    static String hex(byte[] bytes){StringBuilder b=new StringBuilder();for(byte v:bytes)b.append(String.format(Locale.ROOT,"%02x",v&255));return b.toString();}
    static String sha(File f)throws Exception{MessageDigest d=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(f)){byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1)d.update(b,0,n);}return hex(d.digest());}
    static Signature[] signatures(PackageInfo p){return Build.VERSION.SDK_INT>=28?(p.signingInfo==null?null:p.signingInfo.getApkContentsSigners()):p.signatures;}
    static boolean matches(Signature[] s)throws Exception{return s!=null&&s.length==1&&CERT.equals(hex(MessageDigest.getInstance("SHA-256").digest(s[0].toByteArray())));}
    boolean validate(Info v,File f)throws Exception{
        if(!f.isFile()||f.length()!=v.size||!sha(f).equals(v.hash))return false;
        PackageManager pm=a.getPackageManager();int flags=Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;
        PackageInfo archive=pm.getPackageArchiveInfo(f.getAbsolutePath(),flags),current=pm.getPackageInfo(a.getPackageName(),flags);
        if(archive==null||!a.getPackageName().equals(archive.packageName)||!matches(signatures(archive))||!matches(signatures(current)))return false;
        long code=Build.VERSION.SDK_INT>=28?archive.getLongVersionCode():archive.versionCode;
        return code==v.code&&code>installed&&v.name.equals(archive.versionName);
    }
    void verifyAsync(){
        if(verifying||info==null)return;verifying=true;status="Verificando integridade e assinatura…";refresh();final Info v=info;
        worker.execute(()->{boolean ok=false;try{ok=validate(v,file(v));}catch(Exception ignored){}final boolean result=ok;
            ui(()->{verifying=false;if(!result){clearDownload("Arquivo ou assinatura inválida. Baixe novamente.");return;}verified=true;progress=100;downloadedBytes=v.size;status="Atualização verificada. Pronta para instalar.";refresh();});});
    }
    void install(){
        if(!verified||info==null||verifying)return;
        if(Build.VERSION.SDK_INT>=26&&!a.getPackageManager().canRequestPackageInstalls()){
            try{a.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+a.getPackageName())));status="Autorize esta fonte e toque em Instalar novamente.";refresh();}
            catch(Exception e){status="Não foi possível abrir a autorização do Android.";refresh();}return;
        }
        verifying=true;status="Conferindo APK antes de instalar…";refresh();final Info v=info;
        worker.execute(()->{boolean ok=false;try{ok=validate(v,file(v));}catch(Exception ignored){}final boolean valid=ok;
            ui(()->{verifying=false;if(!valid){clearDownload("APK inválido.");return;}
                try{Uri uri=FileProvider.getUriForFile(a,a.getPackageName()+".updates",file(v));Intent i=new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);a.startActivity(i);status="Confirme a instalação no Android.";refresh();}
                catch(Exception e){status="Instalador Android indisponível.";refresh();}
            });});
    }
    void show(){
        if(dialog!=null&&dialog.isShowing())return;
        boolean report=showReport;
        if(report){showReport=false;history.edit().putLong("seenVersion",installed).apply();}
        LinearLayout content=new LinearLayout(a);content.setOrientation(LinearLayout.VERTICAL);content.setPadding(dp(20),dp(8),dp(20),dp(10));
        if(report){TextView reportText=new TextView(a);reportText.setText("Versão "+installedName+" instalada!\nAtualização experimental: "+(installed==202?"progressão rural e mural de missões.":installed==201?"minimapa verde e bússola verde-oliva aprovada.":"consulte as novidades da versão.") );reportText.setTextSize(14);reportText.setPadding(0,0,0,dp(12));content.addView(reportText);}
        detail=new TextView(a);detail.setTextSize(15);content.addView(detail);bar=new ProgressBar(a,null,android.R.attr.progressBarStyleHorizontal);bar.setMax(100);content.addView(bar,new LinearLayout.LayoutParams(-1,dp(24)));
        checkButton=new Button(a);checkButton.setText("Verificar atualizações");checkButton.setOnClickListener(v->check());content.addView(checkButton);
        downloadButton=new Button(a);downloadButton.setText("Baixar em segundo plano");downloadButton.setOnClickListener(v->start());content.addView(downloadButton);
        installButton=new Button(a);installButton.setText("Instalar atualização");installButton.setOnClickListener(v->install());content.addView(installButton);
        cancelButton=new Button(a);cancelButton.setText("Cancelar download");cancelButton.setOnClickListener(v->{if(id>=0&&!verifying&&!verified)new AlertDialog.Builder(a).setTitle("Cancelar transferência?").setMessage("O arquivo parcial será removido. Você poderá baixar novamente.").setNegativeButton("Continuar baixando",null).setPositiveButton("Cancelar download",(dd,ww)->{if(id>=0&&!verifying&&!verified)clearDownload("Download cancelado.");}).show();});content.addView(cancelButton);
        ScrollView scroll=new ScrollView(a);scroll.addView(content);
        dialog=new AlertDialog.Builder(a).setTitle("Central de atualizações · Teste").setView(scroll).setNegativeButton("Continuar jogando",null).create();
        dialog.setOnDismissListener(v->{dialog=null;detail=null;bar=null;checkButton=null;downloadButton=null;installButton=null;cancelButton=null;});dialog.show();refresh();
    }
    void refresh(){
        badge.setText(verified?"Atualização pronta":id>=0?"Atualização "+progress+"%":info!=null?"Atualização • 1":showReport?"Atualizado • "+installedName:"Atualizações");
        if(detail!=null){detail.setText("Canal experimental · "+installedName+(info==null?"":"\nNova versão "+info.name)+"\n"+status+(id>=0&&info!=null?String.format(new Locale("pt","BR"),"\nProgresso: %d%% · %.2f / %.2f MB",progress,downloadedBytes/1000000.0,info.size/1000000.0):""));bar.setProgress(progress);
            checkButton.setEnabled(!checking&&id<0&&!verified);downloadButton.setEnabled(info!=null&&id<0&&!checking&&!verified&&!verifying);installButton.setEnabled(verified&&!verifying);cancelButton.setEnabled(id>=0&&!verified&&!verifying);}
    }
}
