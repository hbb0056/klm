var firebaseConfig = {
  apiKey: "API_KEY",
  authDomain: "PROJECT.firebaseapp.com",
  databaseURL: "https://PROJECT-default-rtdb.firebaseio.com",
  projectId: "PROJECT"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.database();

/* ADMIN ŞİFRE */
function adminGiris(){
    let sifre=document.getElementById("sifre").value;
    if(sifre==="1234"){
        window.location="admin.html";
    }else{
        alert("Hatalı şifre");
    }
}

/* OYUNCU EKLE */
function oyuncuEkle(){
    let ad=document.getElementById("oyuncu").value;
    if(ad){
        db.ref("turnuva/oyuncular").push({ad:ad,puan:0,grup:""});
        document.getElementById("oyuncu").value="";
    }
}

/* KELİME EKLE */
function kelimeEkle(){
    let k=document.getElementById("kelime").value.toUpperCase();
    let i=document.getElementById("ipucu").value;
    if(k && i){
        db.ref("turnuva/havuz").push({k:k,i:i});
        document.getElementById("kelime").value="";
        document.getElementById("ipucu").value="";
    }
}

/* GRUP OLUŞTUR */
function gruplariOlustur(){
    db.ref("turnuva/oyuncular").once("value").then(snap=>{
        let list=[];
        snap.forEach(o=>list.push({id:o.key,...o.val()}));

        list.sort(()=>0.5-Math.random());
        let gruplar=["A","B","C","D"];
        let index=0;

        gruplar.forEach(g=>{
            for(let i=0;i<list.length/4;i++){
                if(list[index]){
                    db.ref("turnuva/oyuncular/"+list[index].id)
                    .update({grup:g,puan:0});
                    index++;
                }
            }
        });

        alert("Gruplar hazır");
    });
}

/* PUAN GÜNCELLEME */
function skorGir(macId,p1,p2){
    let s1=parseInt(prompt("Skor "+p1));
    let s2=parseInt(prompt("Skor "+p2));

    db.ref("turnuva/maclar/"+macId).update({
        skor1:s1,
        skor2:s2
    });

    if(s1>s2) puanEkle(p1,3);
    else if(s2>s1) puanEkle(p2,3);
    else{
        puanEkle(p1,1);
        puanEkle(p2,1);
    }
}

function puanEkle(ad,puan){
    db.ref("turnuva/oyuncular").once("value").then(snap=>{
        snap.forEach(o=>{
            if(o.val().ad===ad){
                db.ref("turnuva/oyuncular/"+o.key)
                .update({puan:o.val().puan+puan});
            }
        });
    });
}

/* KELİME OYUNU */
function oyunuBaslat(){
    window.location="oyun.html";
}
