const typeSelect=document.getElementById("generatorType");
const frame=document.getElementById("generatorFrame");

const SOURCES={
  "antar-bank":"/generate-bukti-antar-bank.html?v=51.0.0",
  "sesama-bca":"/generate-bukti-sesama-bca.html?v=51.0.0"
};

typeSelect.addEventListener("change",()=>{
  const next=SOURCES[typeSelect.value];

  if(next){
    frame.src=next;
  }
});
