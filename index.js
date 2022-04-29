async function init() {
const JsSHA = jsSHA;

function getToken(key, options) {
    options = options || {}
    let epoch, time, shaObj, hmac, offset, otp
    options.period = options.period || 30
    options.algorithm = options.algorithm || "SHA-1"
    options.digits = options.digits || 6
    options.timestamp = options.timestamp || Date.now()
    key = base32tohex(key.split(" ").join(""))
    epoch = Math.round(options.timestamp / 1000.0)
    time = leftpad(dec2hex(Math.floor(epoch / options.period)), 16, "0")
    shaObj = new JsSHA(options.algorithm, "HEX")
    shaObj.setHMACKey(key, "HEX")
    shaObj.update(time)
    hmac = shaObj.getHMAC("HEX")
    offset = hex2dec(hmac.substring(hmac.length - 1))
    otp = (hex2dec(hmac.substr(offset * 2, 8)) & hex2dec("7fffffff")) + ""
    otp = otp.substr(Math.max(otp.length - options.digits, 0), options.digits)
    return otp
}

function hex2dec(s) {
    return parseInt(s, 16)
}

function dec2hex(s) {
    return (s < 15.5 ? "0" : "") + Math.round(s).toString(16)
}

function base32tohex(base32) {
    let base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
        bits = "",
        hex = ""

    base32 = base32.replace(/=+$/, "")

    for (let i = 0; i < base32.length; i++) {
        let val = base32chars.indexOf(base32.charAt(i).toUpperCase())
        if (val === -1) throw new Error("Invalid base32 character in key")
        bits += leftpad(val.toString(2), 5, "0")
    }

    for (let i = 0; i + 8 <= bits.length; i += 8) {
        let chunk = bits.substr(i, 8)
        hex = hex + leftpad(parseInt(chunk, 2).toString(16), 2, "0")
    }
    return hex
}

function leftpad(str, len, pad) {
    if (len + 1 >= str.length) {
        str = Array(len + 1 - str.length).join(pad) + str
    }
    return str
}


let adding = false;
let addObj = document.getElementById("add_entry");
addObj.addEventListener("click", async (e) => {
	let card = document.getElementById("putentry");
	if(adding) {
		document.getElementById("entryicon").className = "bx bx-plus-medical addentry"
		card.className = "col-xl-3 col-md-6 mb-4 hide"
	} else {
		document.getElementById("entryicon").className = "bx bxs-minus-square addentry"
		card.className = "col-xl-3 col-md-6 mb-4 i_in"
	}
	adding = !adding;
})

let tokens = await chrome.storage.sync.get(["tfa_codes"]);
tokens = tokens.tfa_codes;


document.getElementById("addtoken").addEventListener("click", async(e) => {
	let token, name;

	token = document.getElementById("token").value
	name = document.getElementById("name").value

	console.log(token, name);

	addKey(token, name);
})

function addKey(token, name) {
	let toks = tokens;
	let id = Date.now();

	toks.push({
		token,
		id,
		name,
		code: ""
	})

	genCard(id, name);
	console.log(toks);

	chrome.storage.sync.set({tfa_codes: tokens}, async() => {

	});
}

function genCard(id, name) {
	let cards = document.getElementById("row");

	let div1 = document.createElement("div")
	div1.className = "col-xl-3 col-md-6 mb-4";
	div1.id = id;
	div1.innerHTML = `<div class="card border-left-danger shadow h-100 py-2"style="background: #1d1b31;">
                <div class="card-body"style="background: #1d1b31;">
                  <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                      <div class="text-xs font-weight-bold text-danger text-uppercase mb-1" id="tempo${id}">${name} - [ 0s ]</div>
                      <div class="h5 mb-0 font-weight-bold text-white-800">
                      	Código: <a href='#' id="codearea${id}">------</a><br>
                      	Clique <a href="#" id="copycodearea${id}">aqui</a> para copiar. 
                      	&nbsp<span style="color: #e74a3b;" class="hide" id="copydisplay${id}">Copiado!</span>
                      	<a href="#" id="rm_entry${id}">
        					<i class='bx bxs-minus-circle rementry'></i>
          				</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>`;
    cards.appendChild(div1);
    return cards;
}

for(let i = 0 ; i < tokens.length ; i++) {
	genCard(tokens[i].id);
	document.getElementById(`rm_entry${tokens[i].id}`).addEventListener("click", e => {
		remove(tokens[i].id, document.getElementById(tokens[i].id));
	});
	document.getElementById(`copycodearea${tokens[i].id}`).addEventListener("click", (e) => {
		copy(tokens[i].code, document.getElementById(`copydisplay${tokens[i].id}`));
	})
}

function remove(id, card) {
	let crds = [];
	for(let i = 0 ; i < tokens.length ; i++) {
		if(tokens[i].id != id) crds.push(tokens[i]);
	}
	tokens = crds;

	chrome.storage.sync.set({tfa_codes: crds}, async() => {
		card.remove();
		window.close();
	});
}


function copy(code, copydisplay) {
	copydisplay.className = "i_in"
	setTimeout(() => {
		copydisplay.className = "i_out"
	}, 3000);

	navigator.clipboard.writeText(code);
}

function gen(faltando) {
    for(let i = 0 ; i < tokens.length ; i++) {
    	let token = tokens[i].token;

    	getTokens(faltando, tokens[i], i);
    }
}

function getTokens(faltando, config, i) {
	let code = getToken(config.token)
	let tempo = document.getElementById("tempo"+config.id);
	let codearea = document.getElementById("codearea"+config.id);
	let copycodearea = document.getElementById("copycodearea"+config.id);
	let copydisplay = document.getElementById("copydisplay"+config.id);



	tokens[i].code = code;
    codearea.innerHTML = code
    tempo.innerHTML = `${config.name} - [ ${faltando}s / 30s ]`
}


gen();
setInterval(() => {
    let time = formatTimer(Date.now()).secondstotal
    temp = time + 1;

    let crr = time % 30;
    let faltando = 30 - crr;

    faltando = 30 - faltando;

    gen(faltando);
}, 1)

function formatTimer(milliseconds) {
    const roundTowardsZero = milliseconds > 0 ? Math.floor : Math.ceil;

    return {
        years: roundTowardsZero(milliseconds / 3.154e+10),
        mouths: roundTowardsZero(milliseconds / 2.628e+9) % 12,
        days: roundTowardsZero(milliseconds / 86400000) % 30,
        daystotal: roundTowardsZero(milliseconds / 86400000),
        hours: roundTowardsZero(milliseconds / 3600000) % 24,
        minutes: roundTowardsZero(milliseconds / 60000) % 60,
        seconds: roundTowardsZero(milliseconds / 1000) % 60,
        secondstotal: roundTowardsZero(milliseconds / 1000),
        milliseconds: roundTowardsZero(milliseconds) % 1000,
        microseconds: roundTowardsZero(milliseconds * 1000) % 1000,
        nanoseconds: roundTowardsZero(milliseconds * 1e6) % 1000
    }
}
};


init();