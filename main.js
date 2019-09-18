'use strict'
require('dotenv').config();
const { createCanvas } = require('canvas');
const Obniz = require('obniz');
const obniz = new Obniz(process.env.OBNIZ_ID);
const request = require('request');

const sendData = value => {
  const options = {
    uri    : 'https://gw.machinist.iij.jp/endpoint',
    headers: {
      'Content-type'  : 'application/json',
      'Authorization' : `Bearer ${process.env.MACHINIST_API_KEY}`
    },
    json: {
      agent   : process.env.MACHINIST_AGENT_NAME,
      metrics : [
        {
            name       : 'CO2 Level [ppm]',
            namespace  : 'Environment Sensors',
            data_point : { value }
        }
      ]
    }
  };
  request.post(options, err => { if(err) console.error(err); });
}

const readCo2 = () => obniz.uart0.send([0xff, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79]);

const onReceive = (data, _) => {
  if(data[0] == 0xff && data[1] == 0x86) {
    const level = data[2] * 100 + data[3];
    console.log(level);
    if(level <= 300) return; // ignore inaccurate data
    sendData(level);

    const canvas = createCanvas(128, 64);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.font = '30px Avenir';
    ctx.fillText(`${level} ppm`, 0, 40);
    obniz.display.clear();
    obniz.display.draw(ctx);
    ctx.clearRect(0, 0, 128, 64);
  }
}

obniz.onconnect = async () => {
  obniz.uart0.start({ tx: 0, rx: 1, baud: 9600 });
  obniz.wired('USB', { gnd: 4, vcc: 6 }).on();
  obniz.keepWorkingAtOffline(true);
  obniz.uart0.onreceive = onReceive;
  // update every 20sec
  setInterval(readCo2, 20 * 1000);
};
