
import { parseAddressString } from './src/react-app/utils/addressParser.ts';

const addr = 'AV ALONSO CAMPOI PADILHA QUADRA, n° 18-15, CIDADE IND., ATACADISTA E DE SERV, BAURU - SP, CEP: 17.066-770';

console.log('Testing address:', addr);
const result = parseAddressString(addr);
console.log('Result:', JSON.stringify(result, null, 2));

const addr2 = "AV ALONSO CAMPOI PADILHA QUADRA, nº 18-15, CIDADE IND., ATACADISTA E DE SERV, BAURU - SP, CEP: 17.066-770";
console.log('Testing address with ordinal:', addr2);
const result2 = parseAddressString(addr2);
console.log('Result 2:', JSON.stringify(result2, null, 2));
