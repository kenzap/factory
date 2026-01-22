/**
 * Converts a monetary amount to its written representation in the specified language
 * 
 * @param {number} amount - The monetary amount to convert (e.g., 123.45)
 * @param {Object} settings - Configuration object containing currency and locale settings
 * @param {string} settings.currency - The currency code (e.g., "EUR", "USD")
 * @param {string} [countryCode] - The country code for localization (e.g., "LV", "DE", "FR")
 * 
 * @returns {string} The amount expressed in local language words with proper currency notation
 * 
 * @example
 * // Convert 123.45 EUR to German words
 * amountToWords(123.45, { currency: "EUR" }, "DE")
 * // Returns: "Einhundertdreiundzwanzig Euro, 45 Cent"
 * 
 * @example
 * // Convert 0 EUR to French words
 * amountToWords(0, { currency: "EUR" }, "FR")
 * // Returns: "Zéro Euro"
 * 
 */
export const amountToWords = (amount, settings, countryCode = 'LV') => {
    const amount_int = Math.floor(amount);
    const amount_cents = Math.round((amount - amount_int) * 100);

    // Localization data for each country
    const localizations = {
        AT: {
            units: ["", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun"],
            teens: ["zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"],
            tens: ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"],
            hundreds: ["", "einhundert", "zweihundert", "dreihundert", "vierhundert", "fünfhundert", "sechshundert", "siebenhundert", "achthundert", "neunhundert"],
            thousand: "tausend",
            zero: "null",
            currency: { EUR: { main: "Euro", cents: "Cent" } },
            connector: ", "
        },
        BE: {
            units: ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"],
            teens: ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"],
            tens: ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "septante", "quatre-vingts", "nonante"],
            hundreds: ["", "cent", "deux cents", "trois cents", "quatre cents", "cinq cents", "six cents", "sept cents", "huit cents", "neuf cents"],
            thousand: "mille",
            zero: "zéro",
            currency: { EUR: { main: "Euro", cents: "centime" } },
            connector: ", "
        },
        BG: {
            units: ["", "едно", "две", "три", "четири", "пет", "шест", "седем", "осем", "девет"],
            teens: ["десет", "единадесет", "дванадесет", "тринадесет", "четиринадесет", "петнадесет", "шестнадесет", "седемнадесет", "осемнадесет", "деветнадесет"],
            tens: ["", "", "двадесет", "тридесет", "четиридесет", "петдесет", "шестдесет", "седемдесет", "осемдесет", "деветдесет"],
            hundreds: ["", "сто", "двеста", "триста", "четиристотин", "петстотин", "шестстотин", "седемстотин", "осемстотин", "деветстотин"],
            thousand: "хиляди",
            zero: "нула",
            currency: { EUR: { main: "Евро", cents: "цента" } },
            connector: ", "
        },
        HR: {
            units: ["", "jedan", "dva", "tri", "četiri", "pet", "šest", "sedam", "osam", "devet"],
            teens: ["deset", "jedanaest", "dvanaest", "trinaest", "četrnaest", "petnaest", "šesnaest", "sedamnaest", "osamnaest", "devetnaest"],
            tens: ["", "", "dvadeset", "trideset", "četrdeset", "pedeset", "šezdeset", "sedamdeset", "osamdeset", "devedeset"],
            hundreds: ["", "sto", "dvjesto", "tristo", "četiristo", "petsto", "šesto", "sedamsto", "osamsto", "devetsto"],
            thousand: "tisuća",
            zero: "nula",
            currency: { EUR: { main: "Euro", cents: "cent" } },
            connector: ", "
        },
        CY: {
            units: ["", "ένα", "δύο", "τρία", "τέσσερα", "πέντε", "έξι", "επτά", "οκτώ", "εννέα"],
            teens: ["δέκα", "έντεκα", "δώδεκα", "δεκατρία", "δεκατέσσερα", "δεκαπέντε", "δεκαέξι", "δεκαεπτά", "δεκαοκτώ", "δεκαεννέα"],
            tens: ["", "", "είκοσι", "τριάντα", "σαράντα", "πενήντα", "εξήντα", "εβδομήντα", "ογδόντα", "ενενήντα"],
            hundreds: ["", "εκατό", "διακόσια", "τριακόσια", "τετρακόσια", "πεντακόσια", "εξακόσια", "επτακόσια", "οκτακόσια", "εννιακόσια"],
            thousand: "χίλια",
            zero: "μηδέν",
            currency: { EUR: { main: "Ευρώ", cents: "λεπτό" } },
            connector: ", "
        },
        CZ: {
            units: ["", "jeden", "dva", "tři", "čtyři", "pět", "šest", "sedm", "osm", "devět"],
            teens: ["deset", "jedenáct", "dvanáct", "třináct", "čtrnáct", "patnáct", "šestnáct", "sedmnáct", "osmnáct", "devatenáct"],
            tens: ["", "", "dvacet", "třicet", "čtyřicet", "padesát", "šedesát", "sedmdesát", "osmdesát", "devadesát"],
            hundreds: ["", "sto", "dvěstě", "třista", "čtyřista", "pětset", "šestset", "sedmset", "osmset", "devětset"],
            thousand: "tisíc",
            zero: "nula",
            currency: { EUR: { main: "Euro", cents: "cent" } },
            connector: ", "
        },
        DK: {
            units: ["", "en", "to", "tre", "fire", "fem", "seks", "syv", "otte", "ni"],
            teens: ["ti", "elleve", "tolv", "tretten", "fjorten", "femten", "seksten", "sytten", "atten", "nitten"],
            tens: ["", "", "tyve", "tredive", "fyrre", "halvtreds", "tres", "halvfjerds", "firs", "halvfems"],
            hundreds: ["", "etthundrede", "tohundrede", "trehundrede", "firehundrede", "femhundrede", "sekshundrede", "syvhundrede", "ottehundrede", "nihundrede"],
            thousand: "tusind",
            zero: "nul",
            currency: { EUR: { main: "Euro", cents: "øre" } },
            connector: ", "
        },
        EE: {
            units: ["", "üks", "kaks", "kolm", "neli", "viis", "kuus", "seitse", "kaheksa", "üheksa"],
            teens: ["kümme", "üksteist", "kaksteist", "kolmteist", "neliteist", "viisteist", "kuusteist", "seitseteist", "kaheksateist", "üheksateist"],
            tens: ["", "", "kakskümmend", "kolmkümmend", "nelikümmend", "viiskümmend", "kuuskümmend", "seitsekümmend", "kaheksakümmend", "üheksakümmend"],
            hundreds: ["", "ükssada", "kakssada", "kolmsada", "nelisada", "viissada", "kuussada", "seitsesada", "kaheksasada", "üheksasada"],
            thousand: "tuhat",
            zero: "null",
            currency: { EUR: { main: "Euro", cents: "sent" } },
            connector: ", "
        },
        FI: {
            units: ["", "yksi", "kaksi", "kolme", "neljä", "viisi", "kuusi", "seitsemän", "kahdeksan", "yhdeksän"],
            teens: ["kymmenen", "yksitoista", "kaksitoista", "kolmetoista", "neljätoista", "viisitoista", "kuusitoista", "seitsemäntoista", "kahdeksantoista", "yhdeksäntoista"],
            tens: ["", "", "kaksikymmentä", "kolmekymmentä", "neljäkymmentä", "viisikymmentä", "kuusikymmentä", "seitsemänkymmentä", "kahdeksankymmentä", "yhdeksänkymmentä"],
            hundreds: ["", "sata", "kaksisataa", "kolmesataa", "neljäsataa", "viisisataa", "kuusisataa", "seitsemänsataa", "kahdeksansataa", "yhdeksänsataa"],
            thousand: "tuhatta",
            zero: "nolla",
            currency: { EUR: { main: "Euro", cents: "sentti" } },
            connector: ", "
        },
        FR: {
            units: ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"],
            teens: ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"],
            tens: ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingts", "quatre-vingt-dix"],
            hundreds: ["", "cent", "deux cents", "trois cents", "quatre cents", "cinq cents", "six cents", "sept cents", "huit cents", "neuf cents"],
            thousand: "mille",
            zero: "zéro",
            currency: { EUR: { main: "Euro", cents: "centime" } },
            connector: ", "
        },
        DE: {
            units: ["", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun"],
            teens: ["zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"],
            tens: ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"],
            hundreds: ["", "einhundert", "zweihundert", "dreihundert", "vierhundert", "fünfhundert", "sechshundert", "siebenhundert", "achthundert", "neunhundert"],
            thousand: "tausend",
            zero: "null",
            currency: { EUR: { main: "Euro", cents: "Cent" } },
            connector: ", "
        },
        GR: {
            units: ["", "ένα", "δύο", "τρία", "τέσσερα", "πέντε", "έξι", "επτά", "οκτώ", "εννέα"],
            teens: ["δέκα", "έντεκα", "δώδεκα", "δεκατρία", "δεκατέσσερα", "δεκαπέντε", "δεκαέξι", "δεκαεπτά", "δεκαοκτώ", "δεκαεννέα"],
            tens: ["", "", "είκοσι", "τριάντα", "σαράντα", "πενήντα", "εξήντα", "εβδομήντα", "ογδόντα", "ενενήντα"],
            hundreds: ["", "εκατό", "διακόσια", "τριακόσια", "τετρακόσια", "πεντακόσια", "εξακόσια", "επτακόσια", "οκτακόσια", "εννιακόσια"],
            thousand: "χίλια",
            zero: "μηδέν",
            currency: { EUR: { main: "Ευρώ", cents: "λεπτό" } },
            connector: ", "
        },
        HU: {
            units: ["", "egy", "kettő", "három", "négy", "öt", "hat", "hét", "nyolc", "kilenc"],
            teens: ["tíz", "tizenegy", "tizenkettő", "tizenhárom", "tizennégy", "tizenöt", "tizenhat", "tizenhét", "tizennyolc", "tizenkilenc"],
            tens: ["", "", "húsz", "harminc", "negyven", "ötven", "hatvan", "hetven", "nyolcvan", "kilencven"],
            hundreds: ["", "száz", "kétszáz", "háromszáz", "négyszáz", "ötszáz", "hatszáz", "hétszáz", "nyolcszáz", "kilencszáz"],
            thousand: "ezer",
            zero: "nulla",
            currency: { EUR: { main: "Euró", cents: "cent" } },
            connector: ", "
        },
        IE: {
            units: ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
            teens: ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"],
            tens: ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"],
            hundreds: ["", "one hundred", "two hundred", "three hundred", "four hundred", "five hundred", "six hundred", "seven hundred", "eight hundred", "nine hundred"],
            thousand: "thousand",
            zero: "zero",
            currency: { EUR: { main: "Euro", cents: "cent" } },
            connector: ", "
        },
        IT: {
            units: ["", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove"],
            teens: ["dieci", "undici", "dodici", "tredici", "quattordici", "quindici", "sedici", "diciassette", "diciotto", "diciannove"],
            tens: ["", "", "venti", "trenta", "quaranta", "cinquanta", "sessanta", "settanta", "ottanta", "novanta"],
            hundreds: ["", "cento", "duecento", "trecento", "quattrocento", "cinquecento", "seicento", "settecento", "ottocento", "novecento"],
            thousand: "mila",
            zero: "zero",
            currency: { EUR: { main: "Euro", cents: "centesimo" } },
            connector: ", "
        },
        LV: {
            units: ["", "viens", "divi", "trīs", "četri", "pieci", "seši", "septiņi", "astoņi", "deviņi"],
            teens: ["desmit", "vienpadsmit", "divpadsmit", "trīspadsmit", "četrpadsmit", "piecpadsmit", "sešpadsmit", "septiņpadsmit", "astoņpadsmit", "deviņpadsmit"],
            tens: ["", "", "divdesmit", "trīsdesmit", "četrdesmit", "piecdesmit", "sešdesmit", "septiņdesmit", "astoņdesmit", "deviņdesmit"],
            hundreds: ["", "simts", "divsimt", "trīssimt", "četrsimt", "piecsimt", "sešsimt", "septiņsimt", "astoņsimt", "deviņsimt"],
            thousand: "tūkstoši",
            zero: "nulle",
            currency: { EUR: { main: "Eiro", cents: "eirocenti" } },
            connector: ", "
        },
        LT: {
            units: ["", "vienas", "du", "trys", "keturi", "penki", "šeši", "septyni", "aštuoni", "devyni"],
            teens: ["dešimt", "vienuolika", "dvylika", "trylika", "keturiolika", "penkiolika", "šešiolika", "septyniolika", "aštuoniolika", "devyniolika"],
            tens: ["", "", "dvidešimt", "trisdešimt", "keturiasdešimt", "penkiasdešimt", "šešiasdešimt", "septyniasdešimt", "aštuoniasdešimt", "devyniasdešimt"],
            hundreds: ["", "šimtas", "du šimtai", "trys šimtai", "keturi šimtai", "penki šimtai", "šeši šimtai", "septyni šimtai", "aštuoni šimtai", "devyni šimtai"],
            thousand: "tūkstančiai",
            zero: "nulis",
            currency: { EUR: { main: "Euro", cents: "centas" } },
            connector: ", "
        },
        LU: {
            units: ["", "een", "zwou", "dräi", "véier", "fënnef", "sechs", "siwen", "aacht", "néng"],
            teens: ["zéng", "eelef", "zwielef", "dräizéng", "véierzéng", "fofzéng", "sechzéng", "siwenzéng", "aachtzéng", "nongzéng"],
            tens: ["", "", "zwanzeg", "drësseg", "véierzeg", "fofzeg", "sechzeg", "siwenzeg", "aachtzeg", "nongzeg"],
            hundreds: ["", "honnert", "zweehonnert", "dräihonnert", "véierhonnert", "fënnefhonnert", "sechshonnert", "siwenhonnert", "aachthonnert", "nénghonnert"],
            thousand: "dausend",
            zero: "null",
            currency: { EUR: { main: "Euro", cents: "Cent" } },
            connector: ", "
        },
        MT: {
            units: ["", "wieħed", "tnejn", "tlieta", "erbgħa", "ħamsa", "sitta", "sebgħa", "tmienja", "disgħa"],
            teens: ["għaxra", "ħdax", "tnax", "tlettax", "erbatax", "ħmistax", "sittax", "sbatax", "tmintax", "dsatax"],
            tens: ["", "", "għoxrin", "tletin", "erbgħin", "ħamsin", "sittin", "sebgħin", "tmenin", "disgħin"],
            hundreds: ["", "mija", "mitejn", "tlett mijiet", "erbgħa mijiet", "ħames mijiet", "sitt mijiet", "sebgħa mijiet", "tmienja mijiet", "disgħa mijiet"],
            thousand: "elf",
            zero: "żero",
            currency: { EUR: { main: "Euro", cents: "ċenteżmu" } },
            connector: ", "
        },
        NL: {
            units: ["", "een", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen"],
            teens: ["tien", "elf", "twaalf", "dertien", "veertien", "vijftien", "zestien", "zeventien", "achttien", "negentien"],
            tens: ["", "", "twintig", "dertig", "veertig", "vijftig", "zestig", "zeventig", "tachtig", "negentig"],
            hundreds: ["", "honderd", "tweehonderd", "driehonderd", "vierhonderd", "vijfhonderd", "zeshonderd", "zevenhonderd", "achthonderd", "negenhonderd"],
            thousand: "duizend",
            zero: "nul",
            currency: { EUR: { main: "Euro", cents: "cent" } },
            connector: ", "
        },
        PL: {
            units: ["", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć"],
            teens: ["dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście", "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście"],
            tens: ["", "", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt", "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt"],
            hundreds: ["", "sto", "dwieście", "trzysta", "czterysta", "pięćset", "sześćset", "siedemset", "osiemset", "dziewięćset"],
            thousand: "tysięcy",
            zero: "zero",
            currency: { EUR: { main: "Euro", cents: "grosz" } },
            connector: ", "
        },
        PT: {
            units: ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"],
            teens: ["dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezanove"],
            tens: ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"],
            hundreds: ["", "cem", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"],
            thousand: "mil",
            zero: "zero",
            currency: { EUR: { main: "Euro", cents: "cêntimo" } },
            connector: ", "
        },
        RO: {
            units: ["", "unu", "doi", "trei", "patru", "cinci", "șase", "șapte", "opt", "nouă"],
            teens: ["zece", "unsprezece", "doisprezece", "treisprezece", "paisprezece", "cincisprezece", "șaisprezece", "șaptesprezece", "optsprezece", "nouăsprezece"],
            tens: ["", "", "douăzeci", "treizeci", "patruzeci", "cincizeci", "șaizeci", "șaptezeci", "optzeci", "nouăzeci"],
            hundreds: ["", "o sută", "două sute", "trei sute", "patru sute", "cinci sute", "șase sute", "șapte sute", "opt sute", "nouă sute"],
            thousand: "mii",
            zero: "zero",
            currency: { EUR: { main: "Euro", cents: "ban" } },
            connector: ", "
        },
        SK: {
            units: ["", "jeden", "dva", "tri", "štyri", "päť", "šesť", "sedem", "osem", "deväť"],
            teens: ["desať", "jedenásť", "dvanásť", "trinásť", "štrnásť", "pätnásť", "šestnásť", "sedemnásť", "osemnásť", "devätnásť"],
            tens: ["", "", "dvadsať", "tridsať", "štyridsať", "päťdesiat", "šesťdesiat", "sedemdesiat", "osemdesiat", "deväťdesiat"],
            hundreds: ["", "sto", "dvesto", "tristo", "štyristo", "päťsto", "šesťsto", "sedemsto", "osemsto", "deväťsto"],
            thousand: "tisíc",
            zero: "nula",
            currency: { EUR: { main: "Euro", cents: "cent" } },
            connector: ", "
        },
        SI: {
            units: ["", "eden", "dva", "tri", "štiri", "pet", "šest", "sedem", "osem", "devet"],
            teens: ["deset", "enajst", "dvanajst", "trinajst", "štirinajst", "petnajst", "šestnajst", "sedemnajst", "osemnajst", "devetnajst"],
            tens: ["", "", "dvajset", "trideset", "štirideset", "petdeset", "šestdeset", "sedemdeset", "osemdeset", "devetdeset"],
            hundreds: ["", "sto", "dvesto", "tristo", "štiristo", "petsto", "šeststo", "sedemsto", "osemsto", "devetsto"],
            thousand: "tisoč",
            zero: "nič",
            currency: { EUR: { main: "Euro", cents: "cent" } },
            connector: ", "
        },
        ES: {
            units: ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"],
            teens: ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"],
            tens: ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"],
            hundreds: ["", "cien", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"],
            thousand: "mil",
            zero: "cero",
            currency: { EUR: { main: "Euro", cents: "céntimo" } },
            connector: ", "
        },
        SE: {
            units: ["", "ett", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio"],
            teens: ["tio", "elva", "tolv", "tretton", "fjorton", "femton", "sexton", "sjutton", "arton", "nitton"],
            tens: ["", "", "tjugo", "trettio", "fyrtio", "femtio", "sextio", "sjuttio", "åttio", "nittio"],
            hundreds: ["", "etthundra", "tvåhundra", "trehundra", "fyrahundra", "femhundra", "sexhundra", "sjuhundra", "åttahundra", "niohundra"],
            thousand: "tusen",
            zero: "noll",
            currency: { EUR: { main: "Euro", cents: "öre" } },
            connector: ", "
        }
    };

    // Get localization or fall back to Latvian
    const locale = localizations[countryCode] || localizations.LV;
    const { units, teens, tens, hundreds, thousand, zero, currency, connector } = locale;

    function numberToWords(num) {
        if (num === 0) return "";

        let words = '';

        // Handle thousands
        if (num >= 1000) {
            const thousandsPart = Math.floor(num / 1000);
            const thousandsWords = numberToWords(thousandsPart);
            words += thousandsWords + " " + thousand + " ";
            num %= 1000;
        }

        // Handle hundreds
        if (num >= 100) {
            const hundredsPart = Math.floor(num / 100);
            words += hundreds[hundredsPart] + " ";
            num %= 100;
        }

        // Handle tens
        if (num >= 20) {
            words += tens[Math.floor(num / 10)] + " ";
            num %= 10;
        } else if (num >= 10) {
            words += teens[num - 10] + " ";
            return words.trim();
        }

        // Handle units
        if (num > 0) {
            words += units[num] + " ";
        }

        return words.trim();
    }

    let result = '';

    // Convert the main amount to words
    const mainWords = numberToWords(amount_int);
    if (mainWords) {
        result += mainWords.charAt(0).toUpperCase() + mainWords.slice(1) + " ";
    } else {
        result += zero.charAt(0).toUpperCase() + zero.slice(1) + " ";
    }

    // Add currency
    const currencyInfo = currency[settings.currency] || { main: settings.currency, cents: "cents" };
    result += currencyInfo.main;

    // Add cents if present
    if (amount_cents > 0) {
        result += connector + amount_cents + " " + currencyInfo.cents;
    }

    return result;
}
