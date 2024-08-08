// MedPlus Box
// 分成兩部分
// 1.與API Server 串接，並且保留像API Server Send的功能
// 2.本地Ws Server，與Python串接

// 架設本地Ws
const Express = require(`express`);
const App = Express();
// 架設本地WS、連接API Server
const WebSocket = require(`ws`);
const FormData = require(`form-data`);

// 基本套件
const Fs = require(`fs`);
const MD5 = require(`md5`);
const Argv = require(`./Lib/argv.js`);
const DateToStr = require(`./Lib/datetostr.js`);

// 保留靜態網站部分，DeBug模式
const ArgvDeBug = Argv.Inq(`debug`) || false;
const DeBug = ArgvDeBug;

// 固定變數
let Val = JSON.parse(Fs.readFileSync(`./Json/Values.json`));

// 本地WS相關變數
const ArgvLocalIP = Argv.Inq(`localip`) || `0.0.0.0`;
const ArgvLocalPort = Argv.Inq(`localport`) || `5000`;
Argv.Help.Add(`-localip      Local Service IP address`);
Argv.Help.Add(`-localport    Local Service Port`);
const LocalPath = `/ws`;

// API Server串接相關變數
const DriveID = Val.ID;
const DriveName = Val.Name;
const ArgvAPIIP = Argv.Inq(`apiip`) || `192.168.10.1`;
const ArgvAPIPort = Argv.Inq(`apiport`) || `8001`;
const APIPath = `/api`

// Show help msg
Argv.Help.Show();

// 本地Ws
// Server服務
const WebServer = App.listen(ArgvLocalPort, ArgvLocalIP, () => {
	const DateStr = DateToStr(new Date(), `yyyy-MM-dd-hh:mm:ss`);
	console.log(DateStr, `Local Web Server Start`);
})
// 設定之後可能會用到的靜態網頁，目前這三項沒用到
App.set('trust proxy', true);
App.set(`view engine`, `jade`);
App.set(`views`, `${__dirname}/Views`);
// 掛接Ws到Path上
const WsServer = new WebSocket.Server({ server: WebServer, path: LocalPath });
WsServer.on(`connection`, (Ws) => {
	WsOpen(Ws);
	Ws.on(`message`, (Msg) => WsMsg(Ws, Msg));
	Ws.on(`close`, (Msg) => WsClose(Ws, Msg));
});

// 本地Ws不需要Select，所以增加一個WsOpen()來處理連線的訊息
// 建立一個WsLocal
let WsLocal;
const WsOpen = (Ws) => {
	const DateStr = DateToStr(new Date(), `yyyy-MM-dd-hh:mm:ss`);
	WsLocal = Ws;
	console.log(DateStr, `Local Ws Open`);
}

const WsClose = (Ws, Msg) => {
	try {
		const DateStr = DateToStr(new Date(), `yyyy-MM-dd-hh:mm:ss`);
		console.log(DateStr, `Local Ws Close`);
	} catch (Err) {
		console.error(Err);
	}
};

const WsMsg = (Ws, Msg) => {
	try {
		const DateStr = DateToStr(new Date(), `yyyy-MM-dd-hh:mm:ss`);
		const Data = JSON.parse(Msg);
		console.log(DateStr, `Local Ws`, Data.function);
		if (DeBug) console.log(Data);

		// 轉發給API Server的function與API一樣
		// 有可能會改動，改得更加通用
		// 10臨時版
		switch (Data.function) {
			case `NodeSelect`:
			case `ImgMed`:
			case 'GetPatientData':
				// 直接轉發，不做處理
				ResData = Data;
				WsAPI.send(JSON.stringify(ResData));
				break;
			default:
				console.log(DateStr, `Local Ws Error`, Data.function);
				return;
		}
		return;
	} catch (Err) {
		console.error(Err);
	}
}

// --------------------------------------------------
// API Server串接
// APO Server串接，打包成WsConnect，Return Ws Obj
const WsConnect = (WsUrl, Type, ID, ConnectName, RunFunction, OnMessage) => {
	try {
		const DateStr = DateToStr(new Date(), `yyyy-MM-dd-hh:mm:ss`);
		const Ws = new WebSocket(WsUrl);
		Ws.on(`open`, () => {
			console.log(DateStr, `API Ws Open`, ConnectName);
			let Data = {
				function: `NodeRegister`,
				data: { Type: Type, ID: ID }
			};
			Ws.send(JSON.stringify(Data));
			OnMessage && Ws.on(`message`, (Msg) => OnMessage(Msg, ConnectName));
			RunFunction && RunFunction(Ws);
		});
		Ws.on(`close`, (Msg) => {
			console.log(DateStr, `API Ws Close`, ConnectName, Msg);
			setTimeout(() => {
				WsConnect(WsUrl, Type, ID, ConnectName, RunFunction, OnMessage);
			}, 5000);
		});
		Ws.on(`error`, (Err) => console.error(Err));
		return Ws;
	} catch (Err) {
		console.error(Err);
	}
}

let SaveImgMed,SavePrescription,DataPatientID;
const WsUrl = `ws://${ArgvAPIIP}:${ArgvAPIPort}${APIPath}`;
const WsAPI = WsConnect(WsUrl, 0, DriveID, DriveName,
	(Ws) => {

	},
	(Msg, ConnectName) => {
		try {
			const DateStr = DateToStr(new Date(), `yyyy-MM-dd-hh:mm:ss`);
			console.log(DateStr, `${ConnectName}, ${Msg}`);
			const Data = JSON.parse(Msg);
			switch (Data.function) {
				case `ImgMed`:
					// 圖片的辨識結果
					// 儲存圖片
					Fs.writeFileSync(`./Img_Out.png`, Data.data.Img, `base64`);
					// 將圖片辨識的data儲存起來
					SaveImgMed = Data.data;
					// 建立GetPrescription(取的藥單資料)
					ResData = {
						function: `GetPrescription`,
						data: { PatientID: DataPatientID }
					}
					// 送出資料
					WsAPI.send(JSON.stringify(ResData));
					break;
				case `GetPatientData`:
					// 病人資料
					// 儲存病人ID
					DataPatientID = Data.data.PatientID;
					break;
				case `GetPrescription`:
					// 藥單資料
					// 儲存藥單資料
					SavePrescription = Data.data;
					// 建立Detection
					// 送出已儲存之Prescription、ImgMed
					ResData = {
						function: `Detection`,
						data: { 
							Prescription : SavePrescription,
							ImgMed: SaveImgMed
						}
					}
					WsAPI.send(JSON.stringify(ResData));
					break;
				default:
					console.log(DateStr, `Local Ws Error`, Data.function);
					return;
			}
		} catch (Err) {
			console.error(Err);
		}
	}
);