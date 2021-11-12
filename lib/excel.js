const XlsxPopulate = require('xlsx-populate')
const moment = require('moment')
const inletTemplate = './file/inlet.xlsx'
const outletTemplate = './file/outlet.xlsx'
const bpaTemplate = './file/bpa.xlsx'
const confColumn = {
    PH: {
        col: 'E'
    },
    COD: {
        col: 'F'
    },
    BOD: {
        col: 'G'
    },
    TSS: {
        col: 'H'
    },
    'LEMAK & MINYAK': {
        col: 'I'
    },
    AMONIAK: {
        col: 'J'
    },
    'TOTAL COLIFORM': {
        col: 'K'
    },
    FE: {
        col: 'L'
    },
    CU: {
        col: 'M'
    },
    SUHU: {
        col: 'N'
    },
    'DEBIT AIR LIMBAH': {
        col: 'U'
    },
    'VOLUME PRODUKSI': {
        col: 'P'
    }
};
 
getAverage = function( total, length ){
    return (total / length).toFixed(2) * 1;
}
months = function( month ){
    let month_idn = ["Januari","Februaru","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    return month_idn[ month ];
}

module.exports = {
    inlet: function(option) {
        let month = option.month;
        let year = option.year;
        let objLoopDates = [];
        for (let index = 1; index <= moment({year: year, month: (month - 1)}).daysInMonth(); index++) {
            let dateNow = moment().set({year: year, month: (month - 1), date: index});
            objLoopDates[dateNow.format('YYYY-MM-DD')] = [];
        }
        option.data.filter(function( row ){
            return row.tipe == 1;
        }).forEach(function( data ){
            let dateNow = moment( new Date(data.reportDate) ).format('YYYY-MM-DD');
            objLoopDates[dateNow].push(data);
        })
        return XlsxPopulate.fromFileAsync(inletTemplate).then(workbook => {
            workbook.sheet("Laporan").cell("E3").value( `: ${months(month - 1)} ${year}`);
            Object.keys(objLoopDates).forEach( function( listDate, iDate ){
                workbook.sheet("Laporan").cell("D" + (iDate + 8)).value( new Date(listDate) );
                if(objLoopDates[listDate].length > 0 )
                    objLoopDates[listDate].forEach(function( row ){
                        workbook.sheet("Laporan").cell( confColumn[row.label_name].col  + (iDate + 8)).value( row.value );
                    });
            });
            return workbook.outputAsync();
        }).then( function(data) {
            return data;
        });
    },
    outlet: function(option) {
        let month = option.month;
        let year = option.year;
        let objLoopDates = [];
        for (let index = 1; index <= moment({year: year, month: (month - 1)}).daysInMonth(); index++) {
            let dateNow = moment().set({year: year, month: (month - 1), date: index});
            objLoopDates[dateNow.format('YYYY-MM-DD')] = [];
        }
        option.data.filter(function( row ){
            return row.tipe == 0;
        }).forEach(function( data ){
            let dateNow = moment( new Date(data.reportDate) ).format('YYYY-MM-DD');
            objLoopDates[dateNow].push(data);
        })
        return XlsxPopulate.fromFileAsync(outletTemplate).then(workbook => {
            workbook.sheet("Laporan").cell("E3").value( `: ${months(month - 1)} ${year}`);
            Object.keys(objLoopDates).forEach( function( listDate, iDate ){
                workbook.sheet("Laporan").cell("D" + (iDate + 8)).value( new Date(listDate) );
                if(objLoopDates[listDate].length > 0 )
                    objLoopDates[listDate].forEach(function( row ){
                        workbook.sheet("Laporan").cell( confColumn[row.label_name].col  + (iDate + 8)).value( row.value );
                    });
            });
            return workbook.outputAsync();
        }).then( function(data) {
            return data;
        });
    },
    bpa: function(option){
        let objAverage = {};
        let oldValueDebitInlet = 0;
        let oldValueDebitOutlet = 0;
        option.data.forEach(function( row ){
            if( !(row.label_name in objAverage) ) {
                objAverage[row.label_name] = {
                    totalInlet:0,
                    totalOutlet: 0,
                    lengthInlet: 0,
                    lengthOutlet: 0
                }
            }  
            if ( row.label_name == 'DEBIT AIR LIMBAH' ) {
                var oldValue = row.tipe == 1 ? oldValueDebitInlet : oldValueDebitOutlet;
                var value = row.value - oldValue;
                oldValueDebitInlet =  row.tipe == 1 ? row.value : oldValueDebitInlet;
                oldValueDebitOutlet =  row.tipe == 0 ? row.value : oldValueDebitOutlet;
            } else {
                var value = row.value; 
            }
            if( row.tipe == 1 ) { 
                objAverage[row.label_name].totalInlet += value;
                objAverage[row.label_name].lengthInlet += 1;
            }
            else if( row.tipe == 0 ) {
                objAverage[row.label_name].totalOutlet += value;
                objAverage[row.label_name].lengthOutlet += 1;
            }
            
        })
        let SHEETNAME = "NBPA"
        return XlsxPopulate.fromFileAsync(bpaTemplate).then(workbook => {
            let inletAverageDebit = getAverage( objAverage[ 'DEBIT AIR LIMBAH' ].totalInlet, objAverage[ 'DEBIT AIR LIMBAH' ].lengthInlet )
            let outletAverageDebit = getAverage( objAverage[ 'DEBIT AIR LIMBAH' ].totalOutlet, objAverage[ 'DEBIT AIR LIMBAH' ].lengthOutlet )
            workbook.sheet(SHEETNAME).cell("E9").value( inletAverageDebit );
            workbook.sheet(SHEETNAME).cell("F9").value( outletAverageDebit );
            workbook.sheet(SHEETNAME).cell("B26").value( `Pasuruan, 01 ${months(option.month - 1)} ${option.year}` );
            let arrColumnTemplate = ['BOD', 'COD', 'TSS', 'LEMAK & MINYAK', '', 'AMONIAK', 'FE', 'CU'];
            arrColumnTemplate.forEach( function(label, iLabel) {
                if( label in objAverage ) {
                    let inletAverage = objAverage[label].lengthInlet == 0 ? 0 : getAverage( objAverage[label].totalInlet , objAverage[label].lengthInlet )
                    let outletAverage = objAverage[label].lengthOutlet == 0 ? 0 : getAverage( objAverage[label].totalOutlet , objAverage[label].lengthOutlet )
                    workbook.sheet(SHEETNAME).row(13).cell( iLabel + 4 ).value( inletAverage );
                    workbook.sheet(SHEETNAME).row(14).cell( iLabel + 4 ).value( outletAverage );
                } 
            })
            return workbook.outputAsync();
        }).then( function(data) {
            return data;
        });
        
    }
};

