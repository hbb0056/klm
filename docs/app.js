// ======================
// FIREBASE CONFIG
// ======================
var firebaseConfig = {
  apiKey: "API_KEY",
  authDomain: "PROJECT.firebaseapp.com",
  databaseURL: "https://PROJECT-default-rtdb.firebaseio.com",
  projectId: "PROJECT"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.database();

// ======================
// OYUNCU EKLEME
// ======================
function oyuncuEkle(){
    var ad = document.getElementById("oyuncu").value;

    if(!ad){
        alert("İsim giriniz");
        return;
    }

    db.ref("turnuva/oyuncular").push({
        ad: ad,
        puan: 0,
        grup: ""
    });

    document.getElementById("oyuncu").value="";
}

// ======================
// KELİME EKLEME
// ======================
function kelimeEkle(){
    var k = document.getElementById("kelime").value.toUpperCase();
    var i = document.getElementById("ipucu").value;

    if(!k || !i){
        alert("Kelime ve ipucu giriniz");
        return;
    }

    db.ref("turnuva/havuz").push({
        kelime: k,
        ipucu: i
    });

    document.getElementById("kelime").value="";
    document.getElementById("ipucu").value="";
}

// ======================
// OTOMATİK GRUP OLUŞTURMA
// ======================
function gruplariOlustur(){

    db.ref("turnuva/oyuncular").once("value").then(function(snapshot){

        var oyuncular = [];

        snapshot.forEach(function(child){
            oyuncular.push({
                id: child.key,
                ...child.val()
            });
        });

        var N = oyuncular.length;

        if(N < 3){
            alert("En az 3 oyuncu gerekli");
            return;
        }

        // Rastgele karıştır
        oyuncular.sort(function(){ return 0.5 - Math.random(); });

        var gruplar = [];

        // Önce maksimum 4'lü grupları hesapla
        var grupSayisi = Math.floor(N / 4);
        var kalan = N % 4;

        // Eğer 1 kişi artıyorsa dengele
        if(kalan === 1){
            grupSayisi -= 1;
            kalan += 4;
        }

        // Grup dizilerini oluştur
        for(var i=0; i<grupSayisi; i++){
            gruplar.push([]);
        }

        // Oyuncuları 4'lü dağıt
        var index = 0;
        for(var g=0; g<grupSayisi; g++){
            for(var j=0; j<4; j++){
                if(index < oyuncular.length){
                    gruplar[g].push(oyuncular[index]);
                    index++;
                }
            }
        }

        // Kalan oyuncuları 3'lük dağıt
        if(kalan > 0){
            var ekstraGrupSayisi = Math.floor(kalan / 3);

            for(var k=0; k<ekstraGrupSayisi; k++){
                gruplar.push([]);
                for(var m=0; m<3; m++){
                    if(index < oyuncular.length){
                        gruplar[gruplar.length-1].push(oyuncular[index]);
                        index++;
                    }
                }
            }
        }

        // Firebase'e yaz
        gruplar.forEach(function(grup, i){

            var harf = String.fromCharCode(65 + i); // A,B,C...

            grup.forEach(function(oyuncu){
                db.ref("turnuva/oyuncular/" + oyuncu.id).update({
                    grup: harf,
                    puan: 0
                });
            });

        });

        alert("Gruplar başarıyla oluşturuldu!");
    });
}
