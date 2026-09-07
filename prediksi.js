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

    /* ========== GAMBAR VIA CLOUDFLARE ========== */
    function normalizeImageUrl(url){
        url=String(url||'').trim();
        if(!url) return '';

        var driveMatch=url.match(/drive\.google\.com\/file\/d\/([^/]+)/i) || url.match(/[?&]id=([^&]+)/i);
        if(driveMatch) return 'https://drive.google.com/uc?export=download&id='+driveMatch[1];

        if(/dropbox\.com/i.test(url)){
            url=url.replace('www.dropbox.com','dl.dropboxusercontent.com');
            url=url.replace(/[?&]dl=0/i,'');
        }
        return url;
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

        var proxyUrl='/tools/image-proxy?url='+encodeURIComponent(url)+'&_='+(Date.now());

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

        requestImageData(url,function(dataUrl,sourceUrl){
            screenshotAreaEl.style.setProperty('--custom-bg-image','url("'+dataUrl+'")');
            screenshotAreaEl.classList.add('has-custom-bg');
            bgUrlInputEl.value=sourceUrl;
            if(save){
                try{localStorage.setItem(BG_STORAGE_KEY,sourceUrl);}catch(e){}
            }
            applyBtn.disabled=false;
            applyBtn.innerHTML='<i class="fas fa-image"></i> TERAPKAN';
            showToast('Background berhasil diterapkan!');
        },function(message){
            applyBtn.disabled=false;
            applyBtn.innerHTML='<i class="fas fa-image"></i> TERAPKAN';
            showToast(message);
        });
    }

    function applyBackgroundFromInput(){
        var url=bgUrlInputEl.value.trim();
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

    /* ========== SCREENSHOT HD / FULL HD / ULTRA HD ========== */
    function takeScreenshot(){
        var btn=document.getElementById('btnSs');
        btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> MEMPROSES HD...';
        btn.disabled=true;

        dateInputEl.style.display='none';
        dateDisplayEl.style.display='block';

        var area=document.getElementById('screenshotArea');
        var requestedScale=parseInt(qualitySelectEl.value,10)||4;
        var basePixels=Math.max(1,area.scrollWidth*area.scrollHeight);
        var safeScale=Math.min(requestedScale,Math.sqrt(32000000/basePixels));
        safeScale=Math.max(2,Math.min(requestedScale,safeScale));

        var fontReady=(document.fonts&&document.fonts.ready) ? document.fonts.ready : Promise.resolve();

        fontReady.then(function(){
            return html2canvas(area,{
                useCORS:true,
                allowTaint:false,
                backgroundColor:'#120003',
                scale:safeScale,
                logging:false,
                imageTimeout:25000,
                removeContainer:true,
                width:area.scrollWidth,
                height:area.scrollHeight,
                scrollX:0,
                scrollY:-window.scrollY
            });
        }).then(function(canvas){
            saveOrCopyCanvas(canvas,requestedScale);
        }).catch(function(err){
            console.error(err);
            showToast('Gagal membuat screenshot HD');
            resetSsBtn();
        });
    }

    function saveOrCopyCanvas(canvas,requestedScale){
        if(navigator.clipboard && window.ClipboardItem){
            canvas.toBlob(function(blob){
                if(!blob){downloadCanvas(canvas,requestedScale);return;}
                navigator.clipboard.write([
                    new ClipboardItem({'image/png':blob})
                ]).then(function(){
                    showToast('Screenshot HD disalin ke clipboard!');
                    resetSsBtn();
                }).catch(function(){
                    downloadCanvas(canvas,requestedScale);
                });
            },'image/png',1);
        }else{
            downloadCanvas(canvas,requestedScale);
        }
    }

    function downloadCanvas(canvas,requestedScale){
        try{
            var datePart=dateDisplayEl.textContent.replace(/\s+/g,'-').toLowerCase();
            var quality=requestedScale>=4?'ultra-hd':(requestedScale===3?'full-hd':'hd');
            var fname='prediksi-'+(pred.market||'lunatogel').replace(/\s/g,'-').toLowerCase()+'-'+datePart+'-'+quality+'.png';
            var a=document.createElement('a');
            a.href=canvas.toDataURL('image/png',1);
            a.download=fname;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('Screenshot '+quality.toUpperCase()+' berhasil didownload!');
        }catch(e){
            try{
                window.open(canvas.toDataURL('image/png',1),'_blank');
                showToast('Screenshot dibuka di tab baru');
            }catch(e2){
                showToast('Gagal menyimpan screenshot');
            }
        }
        resetSsBtn();
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
