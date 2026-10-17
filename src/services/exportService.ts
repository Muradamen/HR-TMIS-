import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { Trader } from '../types/index.js';

export async function exportTradersToExcel(
  traders: Array<Trader & { woredaName?: string; kebeleName?: string; displayName?: string }>,
  res: Response
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Harari Region Trade & Industry Bureau - HT-TMIS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Traders Registry', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  // Title Row
  worksheet.mergeCells('A1:N1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'HARARI PEOPLE NATIONAL REGIONAL STATE — TRADERS REGISTRY EXPORT (HT-TMIS)';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1B5E20' }, // Harari Green
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 30;

  // Header Row
  worksheet.columns = [
    { header: 'Trader Code', key: 'code', width: 18 },
    { header: 'Classification', key: 'type', width: 14 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Trade Name / Full Name', key: 'name', width: 32 },
    { header: 'Owner Name', key: 'owner', width: 25 },
    { header: 'TIN', key: 'tin', width: 16 },
    { header: 'Trade Reg / License', key: 'license', width: 24 },
    { header: 'Woreda', key: 'woreda', width: 16 },
    { header: 'Kebele', key: 'kebele', width: 22 },
    { header: 'Business Sector / Nature', key: 'sector', width: 26 },
    { header: 'Estimated Capital (ETB)', key: 'capital', width: 22 },
    { header: 'Registration Date', key: 'registered_date', width: 18 },
    { header: 'Registered By', key: 'registered_by', width: 16 },
    { header: 'Verified By', key: 'verified_by', width: 16 },
  ];

  const headerRow = worksheet.getRow(2);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E7D32' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' },
    };
  });

  // Populate Data Rows
  traders.forEach((t) => {
    const isLegal = t.trader_type === 'LEGAL';
    const row = worksheet.addRow({
      code: t.trader_code,
      type: t.trader_type,
      status: t.status.replace(/_/g, ' '),
      name: isLegal ? t.legal_details?.trade_name : t.informal_details?.full_name,
      owner: isLegal ? t.legal_details?.owner_full_name : t.informal_details?.full_name,
      tin: isLegal ? t.legal_details?.tin : 'N/A (Informal)',
      license: isLegal
        ? `${t.legal_details?.trade_license_number || t.legal_details?.trade_registration_number}`
        : 'N/A',
      woreda: t.woredaName || 'N/A',
      kebele: t.kebeleName || 'N/A',
      sector: isLegal
        ? t.legal_details?.business_sector.replace(/_/g, ' ')
        : t.informal_details?.nature_of_trade_activity.replace(/_/g, ' '),
      capital: isLegal
        ? 'N/A'
        : Number(t.informal_details?.estimated_capital_assets || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
          }),
      registered_date: t.created_at.substring(0, 10),
      registered_by: t.registered_by,
      verified_by: t.verified_by || 'Pending',
    });

    row.alignment = { vertical: 'middle' };
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="HT_TMIS_Traders_Export_${new Date().toISOString().substring(0, 10)}.xlsx"`
  );

  await workbook.xlsx.write(res);
  res.end();
}

export function exportTraderCertificatePDF(
  trader: Trader & { woredaName?: string; kebeleName?: string },
  res: Response
) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="HT_Certificate_${trader.trader_code}.pdf"`
  );

  doc.pipe(res);

  // Outer Border
  doc
    .lineWidth(3)
    .strokeColor('#1B5E20')
    .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
    .stroke();

  doc
    .lineWidth(1)
    .strokeColor('#C67D00')
    .rect(25, 25, doc.page.width - 50, doc.page.height - 50)
    .stroke();

  // Header
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .fillColor('#1B5E20')
    .text('HARARI PEOPLE NATIONAL REGIONAL STATE', { align: 'center' });

  doc
    .fontSize(12)
    .font('Helvetica')
    .fillColor('#333333')
    .text('TRADE & INDUSTRY DEVELOPMENT BUREAU', { align: 'center' });

  doc
    .fontSize(10)
    .fillColor('#666666')
    .text('Trader Management Information System (HT-TMIS)', { align: 'center' });

  doc.moveDown(0.5);

  // Certificate Banner
  doc
    .rect(40, doc.y, doc.page.width - 80, 26)
    .fill('#1B5E20');

  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#FFFFFF')
    .text('OFFICIAL REGISTRATION & VERIFICATION CERTIFICATE', 40, doc.y - 20, {
      align: 'center',
    });

  doc.moveDown(1.5);

  // Registration ID Box
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor('#1B5E20')
    .text(`TRADER CODE: ${trader.trader_code}`, { align: 'center' });

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#555555')
    .text(`Status: ${trader.status.replace(/_/g, ' ')}  |  Type: ${trader.trader_type} TRADER`, {
      align: 'center',
    });

  doc.moveDown(1);

  // Details Table Content
  const isLegal = trader.trader_type === 'LEGAL';
  const startY = doc.y;

  const leftX = 50;
  const rightX = 300;
  let curY = startY;

  const addField = (label: string, value: string) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1B5E20').text(label, leftX, curY);
    doc.font('Helvetica').fontSize(10).fillColor('#222222').text(value || 'N/A', leftX + 160, curY);
    curY += 22;
  };

  if (isLegal && trader.legal_details) {
    addField('Trade / Business Name:', trader.legal_details.trade_name);
    addField('Owner Full Name:', trader.legal_details.owner_full_name);
    addField('TIN Number:', trader.legal_details.tin);
    addField('Trade License Number:', trader.legal_details.trade_license_number || 'N/A');
    addField('Trade Registration No:', trader.legal_details.trade_registration_number);
    addField('Business Sector:', trader.legal_details.business_sector.replace(/_/g, ' '));
    addField('Trade Scale:', trader.legal_details.trade_scale);
    addField('Ownership Structure:', trader.legal_details.business_ownership_type.replace(/_/g, ' '));
    addField('Region / Woreda:', `${trader.legal_details.region} / ${trader.woredaName || ''}`);
    addField('Kebele & Plot ID:', `${trader.kebeleName || ''} (Plot: ${trader.legal_details.house_number_plot_id || 'N/A'})`);
    addField('Issuing Institution:', trader.legal_details.issuing_institution);
    addField('Issuance Date:', trader.legal_details.date_of_issuance);
  } else if (trader.informal_details) {
    addField('Full Name:', trader.informal_details.full_name);
    addField('National / Resident ID:', trader.informal_details.national_id_resident_id || 'N/A');
    addField('Phone Contact:', trader.informal_details.phone_number || 'N/A');
    addField('Region / Woreda:', `${trader.informal_details.region} / ${trader.woredaName || ''}`);
    addField('Kebele:', trader.kebeleName || 'N/A');
    addField('Specific Market Area:', trader.informal_details.specific_location_market_area);
    addField('Nature of Activity:', trader.informal_details.nature_of_trade_activity.replace(/_/g, ' '));
    addField('Estimated Capital:', `ETB ${Number(trader.informal_details.estimated_capital_assets).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    addField('Operating Driver:', trader.informal_details.reason_for_operating_informally.replace(/_/g, ' '));
    addField('Formalization Pathway:', trader.informal_details.formalization_status_recommendation.replace(/_/g, ' '));
    addField('Assessment Date:', trader.informal_details.date_of_assessment);
  }

  doc.y = curY + 20;

  // Verification & Signatures section
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#333333')
    .text('VERIFICATION AND OFFICIAL ATTESTATION', 50, doc.y);

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#555555')
    .text(
      `This record was submitted by ${trader.registered_by} on ${trader.created_at.substring(0, 10)}. ` +
      `Verification by Director of Trader Control: ${trader.verified_by || 'Pending Official Verification'}. ` +
      `Verified on: ${trader.verified_at ? trader.verified_at.substring(0, 10) : 'N/A'}.`,
      50,
      doc.y + 5,
      { width: 490 }
    );

  doc.moveDown(3);

  const signY = doc.y;
  doc
    .lineWidth(1)
    .strokeColor('#999999')
    .moveTo(70, signY + 30)
    .lineTo(220, signY + 30)
    .stroke();

  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#333333')
    .text('Data Encoder Signature', 70, signY + 35);

  doc
    .lineWidth(1)
    .strokeColor('#999999')
    .moveTo(370, signY + 30)
    .lineTo(520, signY + 30)
    .stroke();

  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#333333')
    .text('Director of Trader Control Seal', 370, signY + 35);

  doc.end();
}
