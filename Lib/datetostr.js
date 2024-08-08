//2020/01/02
//V1.0.1
module.exports = (Date, Y) => {
    let z = {
        y: Date.getFullYear(),
        M: Date.getMonth() + 1,
        d: Date.getDate(),
        h: Date.getHours(),
        m: Date.getMinutes(),
        s: Date.getSeconds()
    };
    return Y.replace(/(y+|M+|d+|h+|m+|s+)/g, (Val) => {
        return ((Val.length > 1 ? "0" : "") + eval('z.' + Val.slice(-1))).slice(-(Val.length > 2 ? Val.length : 2))
    });
}