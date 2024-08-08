# GPIO
from gpiozero import Button
# Time
import time
# Sys
import sys
# Re
import re
# Json
import json
# Ws
import websocket
# threading,多線程套件
import threading
# numpy
import numpy as np
# base64
import base64
# OpenCV
import cv2
# Serial Port
import serial

DeBug = False

# 可調整參數
WsIP = '127.0.0.1'
WsPort = '5000'
# COMPort = 'COM6'
COMPort = '/dev/ttyACM0'
BaudRates = '115200'
for i in range(0,len(sys.argv)):
	if sys.argv[i] == "-DEBUG" or sys.argv[i] == "-DeBug" :
		DeBug = True
	if sys.argv[i] == "-IP" or sys.argv[i] == "-ip" :
		WsIP = str(sys.argv[i + 1])
	if sys.argv[i] == "-PORT" or sys.argv[i] == "-port" :
		WsPort = str(sys.argv[i + 1])
	if sys.argv[i] == "-COM" or sys.argv[i] == "-comport" :
		COMPort = str(sys.argv[i + 1])

# Ws
Ws = websocket.WebSocketApp('127.0.0.1')
WsUrl = str('ws://' + WsIP + ':' + WsPort + '/ws')

# Ws Call Funcfion
def OnMessage(Ws,Msg) :
	print('[Log:Ws]',Msg)

def OnError(Ws,Err) :
	print('[Err:Ws]',Err)
	time.sleep(3)
	ConnectWebsocket(WsUrl)

def OpenFunc(Ws) :
	print('[Log:Ws]','Ws Open')

def OnClose(Ws) :
	print('[Log:Ws]','Ws Close')
	time.sleep(3)
	ConnectWebsocket(WsUrl)

def ConnectWebsocket(WsUrl) :
	global Ws
	Ws = websocket.WebSocketApp(
		WsUrl,
		on_open = OpenFunc,
		on_message = OnMessage,
		on_error = OnError,
		on_close = OnClose
	)
	WsT = threading.Thread(target=Ws.run_forever)
	WsT.daemon = True
	WsT.start()

ConnectWebsocket(WsUrl)

def CamEnvSet(Cam) :
	Cam.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
	Cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
	Cam.set(cv2.CAP_PROP_FOURCC,cv2.VideoWriter_fourcc('M','J','P','G'))

def ImgReSize(Img) :
	Rows,Cols,Channels = Img.shape
	ImgNewSize = min(Rows,Cols)
	ImgNew = np.zeros([ImgNewSize,ImgNewSize,3],np.uint8)
	ImgMove = int((Cols - Rows) / 2)
	ImgNew = Img[0:ImgNewSize,ImgMove:ImgNewSize + ImgMove]
	ImgNew = cv2.resize(ImgNew,(512,512),interpolation=cv2.INTER_AREA)
	return ImgNew;

def ImgToBase64(Img) :
	ImgBase64 = cv2.imencode('.jpg', Img)[1].tostring()
	ImgBase64 = base64.b64encode(ImgBase64)
	return ImgBase64

def CamTest(Source) :
	global Cam
	CamTest = cv2.VideoCapture(Source)
	if (CamTest is None) or (not CamTest.isOpened()) :
		print('Err,Cam is not open.')
		return False
	return True

def main() :
	GPIOButton = Button(4)
	LastButtonPressed  = False

	Barcode = serial.Serial(COMPort, BaudRates)
	Cam = cv2.VideoCapture(0)
	CamEnvSet(Cam)

	while True :
		try :
			Cam.read()
			if GPIOButton.is_pressed :
				if not LastButtonPressed :
					LastButtonPressed = True
					time.sleep(0.5)
					for i in range(10):
						_, Frame = Cam.read()
					CamIsOpen = CamTest(0)
					_, Frame = Cam.read()
					Img = ImgReSize(Frame);
					cv2.waitKey(1)
					ImgBase64 = ImgToBase64(Img)
					ResData = {
						"function": "ImgMed",
						"data": { "Img": str(ImgBase64)[2:-1] }
					}
					ResJson = json.dumps(ResData)
					Ws.send(ResJson)
			else :
				LastButtonPressed = False
			if Barcode.inWaiting() :
				DataRaw = Barcode.read(Barcode.inWaiting())
				Data = DataRaw.decode()
				if DeBug :
					print('[DeBug]Barcode Data:', Data)
				PostJson = re.findall(r"POSTJSON=([\s\S]*?)###",Data)
				if PostJson :
					PostJson = PostJson[0]
					print(PostJson)
					Ws.send(PostJson)
		except Exception as Err :
			print('[Err]',Err)
			Cam = cv2.VideoCapture(0)

if __name__ == '__main__' :
	main()