///////////////
//2021/08/17 //
//V2.0.0     //
///////////////
const Argv = process.argv;
let HelpTextArray = [];

const Inq = (Name) => {
	const Index = Argv.indexOf(`-` + Name);
	if (Index != -1) {
		return Argv[Index + 1];
	} else {
		return null;
	}
};
const Help = {
	Add: (Text) => {
		HelpTextArray.push(Text);
	},
	Show: () => {
		if (Argv.indexOf(`-help`) != -1 || Argv.indexOf(`-?`) != -1)
			HelpTextArray.forEach((HelpText) => console.log(HelpText));
	}
};
module.exports = {
	Inq: Inq,
	Help: Help
}