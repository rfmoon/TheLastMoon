(function(){
    'use strict';

    var MN=['January','February','March','April','May','June','July','August','September','October','November','December'];

    var marketData = {
        "TOTO MACAU 4D":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/033094b5e73f842fcbcc3b235c029e7c/macau-logo.png",
        "TOTO MACAU 5D":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/3cbd41c8d7267cad6a5e55a1f08fd72d/macau-5d-removebg-preview.png",
        "KINGKONG":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/32f87d6c932b0d2eee9b6e1c9028ab41/logo-2.png",
        "HONGKONG":"https://cdn.animaapp.com/projects/66be29ddeca4d2e95aa7b4ce/releases/66be3e204d8f7eb28bb5de15/img/hongkong-lotto-1.png",
        "MAGNUM4D":"https://cdn.areabermain.club/assets/cdn/az4/2024/08/11/20240811/8889f1c5fc738b5148145100c08a0ebc/439-4390693-magnum-pengeluaran-magnum-4d-hari-clipart-removebg-preview.png",
        "NEVADA":"https://cdn.areabermain.club/assets/cdn/az5/2025/08/20/20250820/9c934bcc2fc7552398b144d4b7f15203/nevada.png",
        "SYDNEY":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/1d9ba1f974240b7b5c5e48fa2ef98e0e/sydney-2.png",
        "TOTO CAMBODIA":"https://totocambodialive.com/assets/img/logo.png",
        "BULLSEYE":"https://cdn.areabermain.club/assets/cdn/az4/2024/08/11/20240811/f07d4e2a6517ef1cea9e2a897e4abb98/nz-bullseye.png",
        "CALIFORNIA":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/c89c3a35f7323e90e2e2c5c255bdb7ae/california-pools-jpg.png",
        "CAROLINA EVE":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/799cce2ab08aca8bfb3a4a9c7484d78e/carolina-eve-jpg.png",
        "CAROLINA DAY":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/816329e82e136b1e9faad6d14c8c81bc/carolina-day-pools-jpg.png",
        "FLORIDA EVE":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/801479ca02e15020fac8df0024814152/florida-eve-new-2.png",
        "FLORIDA MID":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/1ffa2459adcc8330fa8874792d59eb1a/florida-mid.png",
        "KENTUCKY EVE":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/ae8e720c8b7d930856cf3f364cc10158/kentucky-eve.png",
        "KENTUCKY MID":"https://kentuckymid.com/wp-content/uploads/2022/07/KENTUCKY-MID.png",
        "NEW YORK EVE":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/1f9a654060201e07442bc78def1bc135/new-york-eve.png",
        "NEW YORK MID":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/7fb415d09885f1a79bfc30b48803cc4d/new-york-mid.png",
        "PCSO":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/a67d9fd134f7211cbe08bd89bd64f79d/pcso-2.png",
        "SINGAPORE":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/ae20d56fcb2d0dea6b0ae637c6bed566/singapore-new.png",
        "HOKI DRAW":"https://cdn.areabermain.club/assets/cdn/az4/2024/12/25/20241225/1de5162dbfea7a85f41b654a2c3a4d07/logo-1.png",
        "OREGON03":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/7715823646164db9d67d280a402dfb51/oregon-jpg.png",
        "OREGON06":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/7715823646164db9d67d280a402dfb51/oregon-jpg.png",
        "OREGON09":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/7715823646164db9d67d280a402dfb51/oregon-jpg.png",
        "OREGON12":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/7715823646164db9d67d280a402dfb51/oregon-jpg.png",
        "BANGKOK 0930":"https://bangkokpoolstoday.com/assets/img/bangkokpools_logo.png",
        "BANGKOK 0130":"https://bangkokpoolstoday.com/assets/img/bangkokpools_logo.png",
        "BRUNEI 21":"https://bruneipools.com/assets/img/brunei-logo.png",
        "BRUNEI 14":"https://bruneipools.com/assets/img/brunei-logo.png",
        "BRUNEI 02":"https://bruneipools.com/assets/img/brunei-logo.png",
        "POIPET12":"https://poipetlottery.com/img/logo.png",
        "POIPET15":"https://poipetlottery.com/img/logo.png",
        "POIPET22":"https://poipetlottery.com/img/logo.png",
        "POIPET19":"https://poipetlottery.com/img/logo.png",
        "CHELSEA 11":"https://chelseapools.co.uk/assets/img/chelseaPools_logo.png",
        "CHELSEA 15":"https://chelseapools.co.uk/assets/img/chelseaPools_logo.png",
        "CHELSEA 19":"https://chelseapools.co.uk/assets/img/chelseaPools_logo.png",
        "CHELSEA 21":"https://chelseapools.co.uk/assets/img/chelseaPools_logo.png",
        "HUAHIN 0100":"https://huahinlottery.com/assets/img/logo.png",
        "HUAHIN 1630":"https://huahinlottery.com/assets/img/logo.png",
        "HUAHIN 2100":"https://huahinlottery.com/assets/img/logo.png",
        "JAKARTA 1400":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/57824d39d3564ef0ebad1b4297693dc9/logo-jakarta-pools-jpg.png",
        "JAKARTA 2330":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/57824d39d3564ef0ebad1b4297693dc9/logo-jakarta-pools-jpg.png",
        "TOTOMALI1530":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/383a30e8a8e65f1d0da9fb7fa850d853/channels4-banner.png",
        "TOTOMALI2030":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/383a30e8a8e65f1d0da9fb7fa850d853/channels4-banner.png",
        "TOTOMALI2330":"https://cdn.areabermain.club/assets/cdn/az4/2025/08/18/20250818/383a30e8a8e65f1d0da9fb7fa850d853/channels4-banner.png"
    };

    var shioList=["Tikus","Kerbau","Harimau","Kelinci","Naga","Ular","Kuda","Kambing","Monyet","Ayam","Anjing","Babi"];
    var pred={};
    var logoEl=document.getElementById('logoImg');
    var brandShotLogoEl=document.getElementById('brandLogoInShot');
    var mktEl=document.getElementById('mktName');
    var dateDisplayEl=document.getElementById('dateDisplay');
    var dateInputEl=document.getElementById('dateInput');
    var screenshotAreaEl=document.getElementById('screenshotArea');
    var bgUrlInputEl=document.getElementById('bgUrlInput');
    var qualitySelectEl=document.getElementById('qualitySelect');
    var logoWidthRangeEl=document.getElementById('logoWidthRange');
    var logoHeightRangeEl=document.getElementById('logoHeightRange');
    var logoWidthValueEl=document.getElementById('logoWidthValue');
    var logoHeightValueEl=document.getElementById('logoHeightValue');
    var logoSizePanelEl=document.getElementById('logoSizePanel');
    var toastTimer=null;
    var BG_STORAGE_KEY='lunatogel_prediction_background_url';
    var QUALITY_STORAGE_KEY='lunatogel_prediction_screenshot_quality';
    var LOGO_WIDTH_STORAGE_KEY='lunatogel_prediction_logo_width';
    var LOGO_HEIGHT_STORAGE_KEY='lunatogel_prediction_logo_height';
    var imageDataCache={};
    if(brandShotLogoEl){
        var headerBrandImg=document.querySelector('.brand-icon img');
        if(headerBrandImg){
            var brandLogoSrc=headerBrandImg.getAttribute('src')||'';
            brandShotLogoEl.src=brandLogoSrc;
            if(brandLogoSrc){
                requestImageData(brandLogoSrc,function(dataUrl){
                    brandShotLogoEl.src=dataUrl;
                },function(){
                    brandShotLogoEl.src=brandLogoSrc;
                });
            }
        }
    }

    function applyLogoSize(widthPercent,heightPx,save){
        widthPercent=47;
        heightPx=80;

        if(brandShotLogoEl){
            brandShotLogoEl.style.width=widthPercent+'%';
            brandShotLogoEl.style.height=heightPx+'px';
            brandShotLogoEl.style.maxWidth='none';
            brandShotLogoEl.style.maxHeight='none';
            brandShotLogoEl.style.objectFit='contain';
        }

        if(logoWidthRangeEl) logoWidthRangeEl.value=widthPercent;
        if(logoHeightRangeEl) logoHeightRangeEl.value=heightPx;
        if(logoWidthValueEl) logoWidthValueEl.textContent=widthPercent+'%';
        if(logoHeightValueEl) logoHeightValueEl.textContent=heightPx+'px';

        try{
            localStorage.removeItem(LOGO_WIDTH_STORAGE_KEY);
            localStorage.removeItem(LOGO_HEIGHT_STORAGE_KEY);
        }catch(e){}
    }

    /* ========== TANGGAL ========== */
    var urlDate=new URLSearchParams(window.location.search).get('d');
    var currentDate;
    if(urlDate){
        var parts=urlDate.trim().split(/\s+/);
        if(parts.length===3){
            var day=parseInt(parts[0],10);
            var mi=MN.findIndex(function(m){return m.toLowerCase()===parts[1].toLowerCase();});
            var year=parseInt(parts[2],10);
            if(!isNaN(day)&&mi!==-1&&!isNaN(year)){
                currentDate=new Date(year,mi,day);
            }
        }
    }
    if(!currentDate||isNaN(currentDate.getTime())) currentDate=new Date();

    function renderDate(){
        dateDisplayEl.textContent=currentDate.getDate()+' '+MN[currentDate.getMonth()]+' '+currentDate.getFullYear();
    }
    renderDate();

    /* ========== TANGGAL SELALU MENGIKUTI TODAY ========== */
    function setDateToToday(){
        var now=new Date();
        currentDate=new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );
        renderDate();

        if(dateInputEl){
            dateInputEl.value=
                currentDate.getFullYear()+'-'+
                String(currentDate.getMonth()+1).padStart(2,'0')+'-'+
                String(currentDate.getDate()).padStart(2,'0');
        }
    }

    function scheduleNextDay(){
        var now=new Date();
        var nextMidnight=new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()+1,
            0,0,0,50
        );

        var delay=nextMidnight.getTime()-now.getTime();

        setTimeout(function(){
            setDateToToday();
            scheduleNextDay();
        },delay);
    }

    // Saat halaman dibuka, langsung gunakan tanggal hari ini.
    setDateToToday();

    // Tidak memakai interval. Hanya menunggu sampai pergantian hari.
    scheduleNextDay();

    // Jika tab/browser tertidur melewati tengah malam, saat dibuka kembali
    // tanggal langsung disamakan dengan Today.
    document.addEventListener('visibilitychange',function(){
        if(!document.hidden) setDateToToday();
    });

    dateDisplayEl.addEventListener('dblclick',function(){
        dateDisplayEl.style.display='none';
        dateInputEl.style.display='inline-block';
        dateInputEl.value=currentDate.getFullYear()+'-'+String(currentDate.getMonth()+1).padStart(2,'0')+'-'+String(currentDate.getDate()).padStart(2,'0');
        dateInputEl.focus();
    });

    dateInputEl.addEventListener('change',function(){
        if(dateInputEl.value){
            currentDate=new Date(dateInputEl.value+'T00:00:00');
            renderDate();
        }
        dateInputEl.style.display='none';
        dateDisplayEl.style.display='block';
    });
    dateInputEl.addEventListener('blur',function(){
        setTimeout(function(){
            dateInputEl.style.display='none';
            dateDisplayEl.style.display='block';
        },150);
    });

    /* ========== TOAST ========== */
    function showToast(msg){
        var t=document.getElementById('toast');
        t.innerHTML='<i class="fas fa-check-circle"></i> '+msg;
        t.classList.add('show');
        if(toastTimer) clearTimeout(toastTimer);
        toastTimer=setTimeout(function(){t.classList.remove('show');},3000);
    }

    function unique(n){
        var d=[0,1,2,3,4,5,6,7,8,9],r='';
        for(var i=0;i<n;i++){var x=Math.floor(Math.random()*d.length);r+=d.splice(x,1)[0];}
        return r;
    }

    // Membuat nomor dengan digit yang tidak berulang di dalam satu nomor.
    // Digit pertama selalu 1-9 supaya panjang 4D/3D/2D tetap utuh.
    function uniqueDigitNumber(length){
        var digits=[0,1,2,3,4,5,6,7,8,9];
        var result='';

        var firstIndex=1+Math.floor(Math.random()*9);
        result+=digits.splice(firstIndex,1)[0];

        for(var i=1;i<length;i++){
            var index=Math.floor(Math.random()*digits.length);
            result+=digits.splice(index,1)[0];
        }
        return result;
    }

    // Selain digit di dalam nomor unik, setiap pilihan dalam grup juga dijamin tidak sama.
    function generateUniqueNumbers(length,count){
        var result=[];
        var used={};
        var safety=0;

        while(result.length<count && safety<5000){
            safety++;
            var number=uniqueDigitNumber(length);
            if(!used[number]){
                used[number]=true;
                result.push(number);
            }
        }
        return result;
    }

    /* ========== BACKGROUND TANPA APPS SCRIPT ========== */
    function normalizeImageUrl(url){
        url=String(url||'').trim();
        if(!url) return '';

        // Google Drive share URL -> direct image URL.
        var driveMatch=
            url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i) ||
            url.match(/drive\.google\.com\/open\?id=([^&#]+)/i) ||
            url.match(/[?&]id=([^&#]+)/i);

        if(driveMatch){
            return 'https://lh3.googleusercontent.com/d/'+driveMatch[1];
        }

        if(/dropbox\.com/i.test(url)){
            url=url.replace('www.dropbox.com','dl.dropboxusercontent.com');
            url=url.replace(/[?&]dl=0/i,'');
        }

        return url;
    }

    function cssImageUrl(url){
        return 'url('+JSON.stringify(String(url||''))+')';
    }

    function googleFileIdFromUrl(url){
        var s=String(url||'').trim();
        var m=
            s.match(/lh\d*\.googleusercontent\.com\/d\/([^/?=#]+)/i) ||
            s.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i) ||
            s.match(/[?&]id=([^&#]+)/i);
        return m ? m[1] : '';
    }

    function requestImageData(url,onSuccess,onError){
        url=normalizeImageUrl(url);

        if(!url){
            onError('Link gambar kosong');
            return;
        }

        if(/^data:image\//i.test(url)){
            onSuccess(url,url);
            return;
        }

        if(imageDataCache[url]){
            onSuccess(imageDataCache[url],url);
            return;
        }

        var proxyUrl=
            '/tools/image-proxy?url='+
            encodeURIComponent(url)+
            '&_='+(Date.now());

        fetch(proxyUrl,{
            method:'GET',
            cache:'no-store',
            credentials:'same-origin'
        })
        .then(function(response){
            if(response.ok) return response.blob();

            return response.text().then(function(text){
                var message='Cloudflare gagal mengambil gambar';

                try{
                    var parsed=JSON.parse(text);
                    if(parsed && parsed.error) message=parsed.error;
                }catch(e){
                    if(text) message=text.slice(0,180);
                }

                throw new Error(message);
            });
        })
        .then(function(blob){
            if(!blob || !blob.size){
                throw new Error('Gambar kosong atau tidak dapat dibaca');
            }

            if(blob.type && !/^image\//i.test(blob.type)){
                throw new Error('Link tersebut bukan file gambar');
            }

            var reader=new FileReader();

            reader.onload=function(){
                var dataUrl=String(reader.result||'');

                if(!dataUrl){
                    onError('Gambar tidak dapat diproses');
                    return;
                }

                imageDataCache[url]=dataUrl;
                onSuccess(dataUrl,url);
            };

            reader.onerror=function(){
                onError('Browser gagal membaca gambar');
            };

            reader.readAsDataURL(blob);
        })
        .catch(function(err){
            onError(
                (err && err.message) ?
                err.message :
                'Gambar tidak dapat diambil dari link tersebut'
            );
        });
    }

    function previewBackgroundDirect(url,onLoaded,onFailed){
        var normalized=normalizeImageUrl(url);
        var candidates=[normalized];
        var googleId=googleFileIdFromUrl(normalized);

        if(googleId){
            // Beberapa link Google membutuhkan varian URL berbeda.
            candidates=[
                'https://lh3.googleusercontent.com/d/'+googleId,
                'https://lh3.googleusercontent.com/d/'+googleId+'=s0',
                'https://drive.google.com/uc?export=view&id='+encodeURIComponent(googleId),
                normalized
            ];
        }

        // Hapus kandidat yang sama.
        var uniqueCandidates=[];
        candidates.forEach(function(item){
            if(item && uniqueCandidates.indexOf(item)===-1){
                uniqueCandidates.push(item);
            }
        });

        var index=0;

        function tryNext(){
            if(index>=uniqueCandidates.length){
                if(onFailed) onFailed();
                return;
            }

            var candidate=uniqueCandidates[index++];
            var probe=new Image();

            probe.onload=function(){
                screenshotAreaEl.style.setProperty(
                    '--custom-bg-image',
                    cssImageUrl(candidate)
                );
                screenshotAreaEl.classList.add('has-custom-bg');

                if(onLoaded) onLoaded(candidate);
            };

            probe.onerror=function(){
                tryNext();
            };

            // Untuk preview jangan pakai crossOrigin.
            // Tujuannya agar CDN Google tetap boleh tampil sebagai background.
            probe.src=candidate;
        }

        tryNext();
    }

    function setBackground(url,save){
        url=normalizeImageUrl(url);

        if(!url){
            screenshotAreaEl.style.setProperty('--custom-bg-image','none');
            screenshotAreaEl.classList.remove('has-custom-bg');

            if(save){
                try{localStorage.removeItem(BG_STORAGE_KEY);}catch(e){}
            }

            return;
        }

        var applyBtn=document.getElementById('btnApplyBg');
        applyBtn.disabled=true;
        applyBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> MEMUAT';

        var finished=false;
        var directWorked=false;

        // LANGKAH 1:
        // Tampilkan URL langsung dahulu. Jadi link Googleusercontent tetap
        // terlihat meskipun server proxy Google sedang menolak request.
        previewBackgroundDirect(
            url,
            function(displayUrl){
                directWorked=true;

                if(save){
                    try{localStorage.setItem(BG_STORAGE_KEY,url);}catch(e){}
                }

                bgUrlInputEl.value=url;

                if(!finished){
                    showToast('Background tampil. Menyiapkan versi screenshot...');
                }
            },
            function(){}
        );

        // LANGKAH 2:
        // Ambil lewat Cloudflare dan ubah ke Data URL.
        // Jika berhasil, background ini aman ikut html2canvas.
        requestImageData(
            url,
            function(dataUrl,sourceUrl){
                finished=true;

                screenshotAreaEl.style.setProperty(
                    '--custom-bg-image',
                    cssImageUrl(dataUrl)
                );
                screenshotAreaEl.classList.add('has-custom-bg');

                bgUrlInputEl.value=url;

                if(save){
                    try{localStorage.setItem(BG_STORAGE_KEY,url);}catch(e){}
                }

                applyBtn.disabled=false;
                applyBtn.innerHTML='<i class="fas fa-image"></i> TERAPKAN';
                showToast('Background berhasil diterapkan dan siap screenshot!');
            },
            function(message){
                finished=true;
                applyBtn.disabled=false;
                applyBtn.innerHTML='<i class="fas fa-image"></i> TERAPKAN';

                // Jika URL langsung berhasil tampil, JANGAN hapus background.
                if(directWorked){
                    showToast(
                        'Background sudah tampil. Proxy screenshot: '+message
                    );
                }else{
                    showToast(message);
                }
            }
        );
    }

    function applyBackgroundFromInput(){
        var url=String(bgUrlInputEl.value||'').trim();

        if(!url){
            showToast('Masukkan link gambar terlebih dahulu');
            bgUrlInputEl.focus();
            return;
        }

        setBackground(url,true);
    }

    function resetBackground(){
        bgUrlInputEl.value='';
        setBackground('',true);
        showToast('Background dikembalikan ke warna merah');
    }

    function setLogo(name,url){
        mktEl.textContent=name;
        if(!url){
            logoEl.removeAttribute('src');
            logoEl.className='market-logo hide';
            return;
        }

        // Tampilkan URL asli dulu. Jadi logo tetap bisa terlihat meskipun
        // Cloudflare proxy sedang gagal atau CDN menolak proxy.
        logoEl.className='market-logo hide';
        logoEl.onload=function(){
            logoEl.className='market-logo show';
        };
        logoEl.onerror=function(){
            logoEl.className='market-logo hide';
        };
        logoEl.src=url;

        // Ambil versi Data URL melalui Cloudflare agar logo lebih stabil saat screenshot.
        requestImageData(url,function(dataUrl){
                var selNow=document.getElementById('pasaranSelect');
                if(!selNow || selNow.value!==name) return;

                var probe=new Image();
                probe.onload=function(){
                    if(selNow.value!==name) return;
                    logoEl.onload=function(){logoEl.className='market-logo show';};
                    logoEl.onerror=function(){
                        // Jika Data URL aneh/gagal, kembalikan ke URL asli.
                        logoEl.onload=function(){logoEl.className='market-logo show';};
                        logoEl.onerror=function(){logoEl.className='market-logo hide';};
                        logoEl.src=url;
                    };
                    logoEl.src=dataUrl;
                };
                probe.src=dataUrl;
        },function(){
            // Jika proxy gagal, URL asli yang sudah terpasang tetap dipakai.
        });
    }

    function gen(){
        var sel=document.getElementById('pasaranSelect');
        var market=sel.value||'HONGKONG';
        setLogo(market,marketData[market]||'');

        var bbfs=unique(7),ai=unique(5);

        // Pilihan 4D / 3D / 2D tanpa angka double:
        // - tidak ada digit yang berulang di dalam satu nomor
        // - tidak ada nomor yang sama dalam grup yang sama
        var d4=generateUniqueNumbers(4,5);
        var d3=generateUniqueNumbers(3,6);
        var d2=generateUniqueNumbers(2,8);

        var c1=Math.floor(Math.random()*10),c2=Math.floor(Math.random()*10);
        while(c2===c1) c2=Math.floor(Math.random()*10);
        var t1=1+Math.floor(Math.random()*9),t2=1+Math.floor(Math.random()*9);
        while(t2===t1) t2=1+Math.floor(Math.random()*9);

        pred={
            market:market,bbfs:bbfs,ai:ai,
            d4:d4,d3:d3,d2:d2,
            cb:c1+' / '+c2,
            tw:t1+''+t1+' / '+t2+''+t2,
            shio:shioList[Math.floor(Math.random()*12)]
        };

        document.getElementById('vBbfs').textContent=bbfs.split('').join(' ');
        document.getElementById('vAi').textContent=ai.split('').join(' ');
        document.getElementById('vShio').textContent=pred.shio;

        var h='';
        for(var i=0;i<d4.length;i++) h+='<div class="chip">'+d4[i]+'</div>';
        document.getElementById('g4d').innerHTML=h;
        h='';
        for(var i=0;i<d3.length;i++) h+='<div class="chip">'+d3[i]+'</div>';
        document.getElementById('g3d').innerHTML=h;
        h='';
        for(var i=0;i<d2.length;i++) h+='<div class="chip sm">'+d2[i]+'</div>';
        document.getElementById('g2d').innerHTML=h;

        document.getElementById('vCb').textContent=pred.cb;
        document.getElementById('vTw').textContent=pred.tw;
    }

    /* ========== SALIN — FONT NORMAL ========== */
    function copyPred(){
        var p=pred;
        var dateStr=dateDisplayEl.textContent;
        var t =
            'PREDIKSI LUNATOGEL\n' +
            'Pasaran: '+p.market+'\n' +
            dateStr+'\n\n' +
            'BBFS KUAT : '+p.bbfs+'\n' +
            'ANGKA IKUT : '+p.ai+'\n\n' +
            '4D : '+p.d4.join(' / ')+'\n' +
            '3D : '+p.d3.join(' / ')+'\n' +
            '2D : '+p.d2.join(' / ')+'\n\n' +
            'COLOK BEBAS : '+p.cb+'\n' +
            'TWIN : '+p.tw+'\n' +
            'SHIO : '+p.shio+'\n\n' +
            'Pasang Sekarang : https://desty.page/lunaofficial776/lun168';

        var ta=document.getElementById('hiddenCopy');
        ta.value=t;
        ta.style.position='fixed';ta.style.left='0';ta.style.top='0';ta.style.opacity='0.01';
        ta.select();
        try{document.execCommand('copy');showToast('Prediksi berhasil disalin!');}
        catch(e){showToast('Gagal menyalin teks');}
        ta.style.position='fixed';ta.style.left='-9999px';ta.style.top='-9999px';ta.style.opacity='0';
    }

    /* ========== SCREENSHOT LANGSUNG TANPA SHARE / HTML2CANVAS ========== */
    function promiseTimeout(promise,ms,fallback){
        return Promise.race([
            promise,
            new Promise(function(resolve){
                setTimeout(function(){
                    resolve(fallback);
                },ms);
            })
        ]);
    }

    function requestImageDataPromiseFast(url){
        url=String(url||'').trim();

        if(!url){
            return Promise.resolve('');
        }

        if(/^data:image\//i.test(url)){
            return Promise.resolve(url);
        }

        return promiseTimeout(
            new Promise(function(resolve){
                requestImageData(
                    url,
                    function(dataUrl){
                        resolve(String(dataUrl||''));
                    },
                    function(){
                        resolve('');
                    }
                );
            }),
            4500,
            ''
        );
    }

    function loadImageForCanvas(src){
        return new Promise(function(resolve){
            if(!src){
                resolve(null);
                return;
            }

            var image=new Image();

            image.onload=function(){
                resolve(image);
            };

            image.onerror=function(){
                resolve(null);
            };

            image.src=src;
        });
    }

    function drawImageCover(ctx,image,x,y,w,h){
        if(!image || !image.naturalWidth || !image.naturalHeight){
            return;
        }

        var scale=Math.max(
            w/image.naturalWidth,
            h/image.naturalHeight
        );

        var dw=image.naturalWidth*scale;
        var dh=image.naturalHeight*scale;

        var dx=x+(w-dw)/2;
        var dy=y+(h-dh)/2;

        ctx.drawImage(
            image,
            dx,dy,dw,dh
        );
    }

    function cssPx(value){
        var n=parseFloat(String(value||'0'));
        return Number.isFinite(n) ? n : 0;
    }

    function hasVisibleColor(value){
        var s=String(value||'').trim().toLowerCase();

        if(
            !s ||
            s==='transparent' ||
            s==='rgba(0, 0, 0, 0)' ||
            s==='rgba(0,0,0,0)'
        ){
            return false;
        }

        return true;
    }

    function roundedPath(ctx,x,y,w,h,r){
        r=Math.max(
            0,
            Math.min(
                r,
                w/2,
                h/2
            )
        );

        ctx.beginPath();

        if(typeof ctx.roundRect==='function'){
            ctx.roundRect(x,y,w,h,r);
            return;
        }

        ctx.moveTo(x+r,y);
        ctx.lineTo(x+w-r,y);
        ctx.quadraticCurveTo(x+w,y,x+w,y+r);
        ctx.lineTo(x+w,y+h-r);
        ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
        ctx.lineTo(x+r,y+h);
        ctx.quadraticCurveTo(x,y+h,x,y+h-r);
        ctx.lineTo(x,y+r);
        ctx.quadraticCurveTo(x,y,x+r,y);
    }

    function transformVisibleText(text,style){
        text=String(text||'');

        var transform=String(
            style.textTransform||''
        ).toLowerCase();

        if(transform==='uppercase'){
            return text.toUpperCase();
        }

        if(transform==='lowercase'){
            return text.toLowerCase();
        }

        return text;
    }

    function measureSpacedText(ctx,text,spacing){
        var total=0;

        for(var i=0;i<text.length;i++){
            total+=ctx.measureText(text[i]).width;

            if(i<text.length-1){
                total+=spacing;
            }
        }

        return total;
    }

    function drawSpacedText(
        ctx,
        text,
        x,
        y,
        spacing,
        align
    ){
        if(!text) return;

        if(!spacing){
            ctx.textAlign=align;
            ctx.fillText(text,x,y);
            return;
        }

        var width=measureSpacedText(
            ctx,
            text,
            spacing
        );

        var cursor=x;

        if(align==='center'){
            cursor=x-width/2;
        }else if(align==='right' || align==='end'){
            cursor=x-width;
        }

        ctx.textAlign='left';

        for(var i=0;i<text.length;i++){
            var ch=text[i];

            ctx.fillText(
                ch,
                cursor,
                y
            );

            cursor+=
                ctx.measureText(ch).width+
                spacing;
        }
    }

    function directTextNodes(element){
        return Array.prototype.filter.call(
            element.childNodes,
            function(node){
                return (
                    node.nodeType===Node.TEXT_NODE &&
                    String(node.nodeValue||'').trim()
                );
            }
        );
    }

    function drawElementBackground(
        ctx,
        element,
        rootRect
    ){
        var style=getComputedStyle(element);

        if(
            style.display==='none' ||
            style.visibility==='hidden' ||
            parseFloat(style.opacity||'1')===0
        ){
            return false;
        }

        var rect=element.getBoundingClientRect();

        if(
            rect.width<=0 ||
            rect.height<=0
        ){
            return false;
        }

        var x=rect.left-rootRect.left;
        var y=rect.top-rootRect.top;
        var w=rect.width;
        var h=rect.height;

        var radius=cssPx(
            style.borderTopLeftRadius
        );

        var bg=style.backgroundColor;

        if(hasVisibleColor(bg)){
            ctx.save();
            roundedPath(
                ctx,
                x,y,w,h,radius
            );
            ctx.fillStyle=bg;
            ctx.fill();
            ctx.restore();
        }

        var borderWidth=cssPx(
            style.borderTopWidth
        );

        var borderColor=
            style.borderTopColor;

        if(
            borderWidth>0 &&
            hasVisibleColor(borderColor)
        ){
            ctx.save();
            roundedPath(
                ctx,
                x+borderWidth/2,
                y+borderWidth/2,
                Math.max(0,w-borderWidth),
                Math.max(0,h-borderWidth),
                Math.max(0,radius-borderWidth/2)
            );
            ctx.lineWidth=borderWidth;
            ctx.strokeStyle=borderColor;
            ctx.stroke();
            ctx.restore();
        }

        // Garis pemisah yang normalnya berupa gradient/pseudo element.
        if(
            element.classList.contains('sep') ||
            element.classList.contains('sec-line')
        ){
            ctx.save();
            ctx.strokeStyle='rgba(255,73,96,.28)';
            ctx.lineWidth=1;
            ctx.beginPath();
            ctx.moveTo(x,y+h/2);
            ctx.lineTo(x+w,y+h/2);
            ctx.stroke();
            ctx.restore();
        }

        return true;
    }

    function drawElementText(
        ctx,
        element,
        rootRect
    ){
        var nodes=directTextNodes(element);

        if(!nodes.length){
            return;
        }

        var style=getComputedStyle(element);

        if(
            style.display==='none' ||
            style.visibility==='hidden' ||
            parseFloat(style.opacity||'1')===0
        ){
            return;
        }

        var fontSize=cssPx(style.fontSize);

        if(fontSize<=0){
            return;
        }

        var fontStyle=
            style.fontStyle &&
            style.fontStyle!=='normal'
            ? style.fontStyle+' '
            : '';

        var fontWeight=
            style.fontWeight || '400';

        var fontFamily=
            style.fontFamily || 'sans-serif';

        ctx.save();
        ctx.font=
            fontStyle+
            fontWeight+' '+
            fontSize+'px '+
            fontFamily;

        ctx.fillStyle=
            hasVisibleColor(style.color)
            ? style.color
            : '#fff';

        ctx.textBaseline='middle';

        var spacing=cssPx(
            style.letterSpacing
        );

        nodes.forEach(function(node){
            var text=transformVisibleText(
                String(node.nodeValue||'')
                    .replace(/\s+/g,' ')
                    .trim(),
                style
            );

            if(!text) return;

            var range=document.createRange();
            range.selectNodeContents(node);

            var rect=range.getBoundingClientRect();

            if(
                rect.width<=0 ||
                rect.height<=0
            ){
                return;
            }

            var x;
            var align='left';
            var textAlign=String(
                style.textAlign||''
            ).toLowerCase();

            if(textAlign==='center'){
                x=
                    rect.left-rootRect.left+
                    rect.width/2;
                align='center';
            }else if(
                textAlign==='right' ||
                textAlign==='end'
            ){
                x=
                    rect.right-rootRect.left;
                align='right';
            }else{
                x=
                    rect.left-rootRect.left;
            }

            var y=
                rect.top-rootRect.top+
                rect.height/2;

            drawSpacedText(
                ctx,
                text,
                x,y,
                spacing,
                align
            );
        });

        ctx.restore();
    }

    function collectScreenshotAssets(area){
        var imageElements=
            Array.prototype.slice.call(
                area.querySelectorAll('img')
            );

        var jobs=imageElements.map(
            function(img,index){
                var src=
                    img.currentSrc ||
                    img.getAttribute('src') ||
                    '';

                return requestImageDataPromiseFast(src)
                    .then(function(dataUrl){
                        return loadImageForCanvas(
                            dataUrl
                        );
                    })
                    .then(function(image){
                        return {
                            element:img,
                            image:image,
                            index:index
                        };
                    });
            }
        );

        var savedBg='';

        try{
            savedBg=String(
                localStorage.getItem(
                    BG_STORAGE_KEY
                )||''
            ).trim();
        }catch(e){}

        var bgJob=
            requestImageDataPromiseFast(savedBg)
            .then(function(dataUrl){
                return loadImageForCanvas(
                    dataUrl
                );
            });

        return Promise.all([
            Promise.all(jobs),
            bgJob
        ])
        .then(function(result){
            return {
                images:result[0],
                background:result[1]
            };
        });
    }

    function renderPredictionCanvas(
        area,
        assets,
        scale
    ){
        var rootRect=
            area.getBoundingClientRect();

        var width=Math.max(
            1,
            Math.ceil(rootRect.width)
        );

        var height=Math.max(
            1,
            Math.ceil(rootRect.height)
        );

        var canvas=
            document.createElement('canvas');

        canvas.width=
            Math.round(width*scale);

        canvas.height=
            Math.round(height*scale);

        var ctx=canvas.getContext('2d');

        if(!ctx){
            throw new Error(
                'Canvas screenshot tidak tersedia'
            );
        }

        ctx.scale(scale,scale);

        // Background gambar custom.
        if(assets.background){
            drawImageCover(
                ctx,
                assets.background,
                0,0,
                width,height
            );
        }

        // Overlay merah seperti tampilan Prediksi.
        var overlay=
            ctx.createLinearGradient(
                0,0,0,height
            );

        if(
            area.classList.contains(
                'has-custom-bg'
            )
        ){
            overlay.addColorStop(
                0,
                'rgba(10,0,2,.54)'
            );
            overlay.addColorStop(
                .55,
                'rgba(18,0,4,.72)'
            );
            overlay.addColorStop(
                1,
                'rgba(8,0,1,.82)'
            );
        }else{
            overlay.addColorStop(
                0,
                'rgba(23,0,4,.94)'
            );
            overlay.addColorStop(
                1,
                'rgba(13,0,2,.96)'
            );
        }

        ctx.fillStyle=overlay;
        ctx.fillRect(
            0,0,
            width,height
        );

        var elements=
            Array.prototype.slice.call(
                area.querySelectorAll('*')
            );

        // Background / border elemen.
        elements.forEach(function(el){
            drawElementBackground(
                ctx,
                el,
                rootRect
            );
        });

        // Logo / gambar.
        assets.images.forEach(
            function(item){
                if(!item.image){
                    return;
                }

                var style=
                    getComputedStyle(
                        item.element
                    );

                if(
                    style.display==='none' ||
                    style.visibility==='hidden' ||
                    parseFloat(
                        style.opacity||'1'
                    )===0
                ){
                    return;
                }

                var rect=
                    item.element
                        .getBoundingClientRect();

                if(
                    rect.width<=0 ||
                    rect.height<=0
                ){
                    return;
                }

                var x=
                    rect.left-
                    rootRect.left;

                var y=
                    rect.top-
                    rootRect.top;

                var iw=
                    item.image.naturalWidth;

                var ih=
                    item.image.naturalHeight;

                if(!iw || !ih){
                    return;
                }

                // object-fit: contain
                var factor=Math.min(
                    rect.width/iw,
                    rect.height/ih
                );

                var dw=iw*factor;
                var dh=ih*factor;

                ctx.drawImage(
                    item.image,
                    x+(rect.width-dw)/2,
                    y+(rect.height-dh)/2,
                    dw,dh
                );
            }
        );

        // Tulisan.
        elements.forEach(function(el){
            drawElementText(
                ctx,
                el,
                rootRect
            );
        });

        return canvas;
    }

    function copyScreenshotCanvas(canvas){
        return new Promise(
            function(resolve,reject){
                if(
                    !navigator.clipboard ||
                    !window.ClipboardItem
                ){
                    reject(
                        new Error(
                            'Browser tidak mendukung copy gambar'
                        )
                    );
                    return;
                }

                canvas.toBlob(
                    function(blob){
                        if(!blob){
                            reject(
                                new Error(
                                    'Screenshot tidak dapat dibuat'
                                )
                            );
                            return;
                        }

                        navigator.clipboard.write([
                            new ClipboardItem({
                                'image/png':blob
                            })
                        ])
                        .then(resolve)
                        .catch(function(){
                            reject(
                                new Error(
                                    'Clipboard gambar ditolak browser'
                                )
                            );
                        });
                    },
                    'image/png',
                    1
                );
            }
        );
    }

    async function takeScreenshot(){
        var btn=
            document.getElementById('btnSs');

        var area=
            document.getElementById(
                'screenshotArea'
            );

        if(!area){
            showToast(
                'Area Prediksi tidak ditemukan'
            );
            return;
        }

        btn.innerHTML=
            '<i class="fas fa-spinner fa-spin"></i> MEMPROSES ULTRA HD...';

        btn.disabled=true;

        dateInputEl.style.display='none';
        dateDisplayEl.style.display='block';

        try{
            if(
                document.fonts &&
                document.fonts.ready
            ){
                await promiseTimeout(
                    document.fonts.ready,
                    2500,
                    null
                );
            }

            var requestedScale=
                parseInt(
                    qualitySelectEl.value,
                    10
                )||4;

            var rect=
                area.getBoundingClientRect();

            var basePixels=Math.max(
                1,
                Math.ceil(rect.width)*
                Math.ceil(rect.height)
            );

            var safeScale=Math.min(
                requestedScale,
                Math.sqrt(
                    32000000/basePixels
                )
            );

            safeScale=Math.max(
                2,
                Math.min(
                    requestedScale,
                    safeScale
                )
            );

            var assets=
                await collectScreenshotAssets(
                    area
                );

            var canvas=
                renderPredictionCanvas(
                    area,
                    assets,
                    safeScale
                );

            await copyScreenshotCanvas(
                canvas
            );

            showToast(
                'Screenshot Prediksi tersalin!'
            );
        }catch(err){
            console.error(
                'Screenshot Prediksi V93 error:',
                err
            );

            var message=
                err && err.message
                ? String(err.message)
                : 'Screenshot gagal';

            showToast(
                'Gagal screenshot: '+
                message.slice(0,100)
            );
        }finally{
            resetSsBtn();
        }
    }

    function resetSsBtn(){
        var btn=document.getElementById('btnSs');
        btn.innerHTML='<i class="fas fa-camera"></i> SCREENSHOT ULTRA HD';
        btn.disabled=false;
    }

    /* ========== INIT ========== */
    var sel=document.getElementById('pasaranSelect');
    for(var key in marketData){
        var opt=document.createElement('option');
        opt.value=key;opt.textContent=key;
        sel.appendChild(opt);
    }
    sel.value='HONGKONG';
    gen();

    try{
        var savedQuality=localStorage.getItem(QUALITY_STORAGE_KEY);
        if(savedQuality && /^(2|3|4)$/.test(savedQuality)) qualitySelectEl.value=savedQuality;

        var savedLogoWidth=localStorage.getItem(LOGO_WIDTH_STORAGE_KEY);
        var savedLogoHeight=localStorage.getItem(LOGO_HEIGHT_STORAGE_KEY);
        applyLogoSize(47,80,false);

        var savedBg=localStorage.getItem(BG_STORAGE_KEY);
        if(savedBg){
            bgUrlInputEl.value=savedBg;
            setBackground(savedBg,false);
        }
    }catch(e){
        applyLogoSize(47,80,false);
    }

    qualitySelectEl.addEventListener('change',function(){
        try{localStorage.setItem(QUALITY_STORAGE_KEY,qualitySelectEl.value);}catch(e){}
        showToast('Kualitas screenshot: '+qualitySelectEl.options[qualitySelectEl.selectedIndex].text);
    });

    document.getElementById('btnLogoSizeToggle').addEventListener('click',function(){
        logoSizePanelEl.classList.toggle('open');
        this.textContent=logoSizePanelEl.classList.contains('open') ? 'TUTUP' : 'ATUR UKURAN';
    });

    logoWidthRangeEl.addEventListener('input',function(){
        applyLogoSize(this.value,logoHeightRangeEl.value,true);
    });
    logoHeightRangeEl.addEventListener('input',function(){
        applyLogoSize(logoWidthRangeEl.value,this.value,true);
    });
    document.getElementById('btnLogoSizeReset').addEventListener('click',function(){
        applyLogoSize(47,80,true);
        showToast('Ukuran logo Lunatogel direset');
    });

    sel.addEventListener('change',gen);
    document.getElementById('btnCopy').addEventListener('click',copyPred);
    document.getElementById('btnRandom').addEventListener('click',gen);
    document.getElementById('btnSs').addEventListener('click',takeScreenshot);
    document.getElementById('btnApplyBg').addEventListener('click',applyBackgroundFromInput);
    document.getElementById('btnResetBg').addEventListener('click',resetBackground);
    bgUrlInputEl.addEventListener('keydown',function(e){
        if(e.key==='Enter'){
            e.preventDefault();
            applyBackgroundFromInput();
        }
    });

})();
