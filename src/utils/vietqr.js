// VietQR Helper Utilities & Bank List

export const POPULAR_BANKS = [
  { code: 'ICB', shortName: 'VietinBank', name: 'Ngân hàng TMCP Công thương Việt Nam', logo: 'https://cdn.vietqr.io/img/ICB.png' },
  { code: 'VCB', shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam', logo: 'https://cdn.vietqr.io/img/VCB.png' },
  { code: 'BIDV', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', logo: 'https://cdn.vietqr.io/img/BIDV.png' },
  { code: 'VBA', shortName: 'Agribank', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn VN', logo: 'https://cdn.vietqr.io/img/VBA.png' },
  { code: 'MB', shortName: 'MBBank', name: 'Ngân hàng TMCP Quân đội', logo: 'https://cdn.vietqr.io/img/MB.png' },
  { code: 'TCB', shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ thương Việt Nam', logo: 'https://cdn.vietqr.io/img/TCB.png' },
  { code: 'ACB', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu', logo: 'https://cdn.vietqr.io/img/ACB.png' },
  { code: 'VPB', shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', logo: 'https://cdn.vietqr.io/img/VPB.png' },
  { code: 'TPB', shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong', logo: 'https://cdn.vietqr.io/img/TPB.png' },
  { code: 'STB', shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', logo: 'https://cdn.vietqr.io/img/SACOMBANK.png' },
  { code: 'HDB', shortName: 'HDBank', name: 'Ngân hàng TMCP Phát triển TP.HCM', logo: 'https://cdn.vietqr.io/img/HDB.png' },
  { code: 'VIB', shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam', logo: 'https://cdn.vietqr.io/img/VIB.png' },
  { code: 'SHB', shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', logo: 'https://cdn.vietqr.io/img/SHB.png' },
  { code: 'EIB', shortName: 'Eximbank', name: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam', logo: 'https://cdn.vietqr.io/img/EIB.png' },
  { code: 'MSB', shortName: 'MSB', name: 'Ngân hàng TMCP Hàng Hải', logo: 'https://cdn.vietqr.io/img/MSB.png' },
  { code: 'OCB', shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông', logo: 'https://cdn.vietqr.io/img/OCB.png' },
  { code: 'LPB', shortName: 'LPBank', name: 'Ngân hàng TMCP Lộc Phát Việt Nam', logo: 'https://cdn.vietqr.io/img/LPBANK.png' },
  { code: 'CAKE', shortName: 'CAKE by VPBank', name: 'Ngân hàng số CAKE by VPBank', logo: 'https://cdn.vietqr.io/img/CAKE.png' },
  { code: 'TIMO', shortName: 'Timo by BanVietBank', name: 'Ngân hàng số Timo', logo: 'https://cdn.vietqr.io/img/TIMO.png' },
  { code: 'momo', shortName: 'MoMo', name: 'Ví điện tử MoMo', logo: 'https://cdn.vietqr.io/img/momo.png' },
  { code: 'VAB', shortName: 'VietABank', name: 'Ngân hàng TMCP Việt Á', logo: 'https://cdn.vietqr.io/img/VAB.png' },
  { code: 'NAB', shortName: 'NamABank', name: 'Ngân hàng TMCP Nam Á', logo: 'https://cdn.vietqr.io/img/NAB.png' },
  { code: 'BAB', shortName: 'BacABank', name: 'Ngân hàng TMCP Bắc Á', logo: 'https://cdn.vietqr.io/img/BAB.png' },
  { code: 'SEAB', shortName: 'SeABank', name: 'Ngân hàng TMCP Đông Nam Á', logo: 'https://cdn.vietqr.io/img/SEAB.png' },
  { code: 'PVCB', shortName: 'PVcomBank', name: 'Ngân hàng TMCP Đại Chúng Việt Nam', logo: 'https://cdn.vietqr.io/img/PVCB.png' },
  { code: 'NCB', shortName: 'NCB', name: 'Ngân hàng TMCP Quốc Dân', logo: 'https://cdn.vietqr.io/img/NCB.png' },
  { code: 'SHBVN', shortName: 'ShinhanBank', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam', logo: 'https://cdn.vietqr.io/img/SHBVN.png' },
  { code: 'ABB', shortName: 'ABBANK', name: 'Ngân hàng TMCP An Bình', logo: 'https://cdn.vietqr.io/img/ABB.png' },
  { code: 'VIETBANK', shortName: 'VietBank', name: 'Ngân hàng TMCP Việt Nam Thương Tín', logo: 'https://cdn.vietqr.io/img/VIETBANK.png' },
  { code: 'BVB', shortName: 'BaoVietBank', name: 'Ngân hàng TMCP Bảo Việt', logo: 'https://cdn.vietqr.io/img/BVB.png' },
  { code: 'SGICB', shortName: 'SaigonBank', name: 'Ngân hàng TMCP Sài Gòn Công Thương', logo: 'https://cdn.vietqr.io/img/SGICB.png' },
  { code: 'SCB', shortName: 'SCB', name: 'Ngân hàng TMCP Sài Gòn', logo: 'https://cdn.vietqr.io/img/SCB.png' },
  { code: 'VCCB', shortName: 'VietCapitalBank', name: 'Ngân hàng TMCP Bản Việt', logo: 'https://cdn.vietqr.io/img/VCCB.png' },
  { code: 'KBank', shortName: 'KBank', name: 'Ngân hàng Đại chúng TNHH Kasikornbank', logo: 'https://cdn.vietqr.io/img/KBank.png' },
  { code: 'ZALOPAY', shortName: 'ZaloPay', name: 'Ví điện tử ZaloPay', logo: 'https://cdn.vietqr.io/img/ZALOPAY.png' },
  { code: 'VTLMONEY', shortName: 'ViettelMoney', name: 'Tổng Công ty Dịch vụ số Viettel', logo: 'https://cdn.vietqr.io/img/VTLMONEY.png' }
]

let cachedBanks = null

export async function fetchVietQRBanks() {
  if (cachedBanks && cachedBanks.length > 0) return cachedBanks
  try {
    const res = await fetch('https://api.vietqr.io/v2/banks')
    const json = await res.json()
    if (json && json.data && Array.isArray(json.data) && json.data.length > 0) {
      cachedBanks = json.data
      return cachedBanks
    }
  } catch (err) {
    console.warn('Lỗi lấy danh sách ngân hàng từ VietQR, dùng danh sách dự phòng:', err)
  }
  return POPULAR_BANKS
}

export function buildVietQRUrl({ bankCode, stk, accountName = '', amount = 0, addInfo = '', template = 'compact' }) {
  if (!bankCode || !stk) return ''
  const cleanStk = encodeURIComponent(String(stk).trim())
  const cleanBank = encodeURIComponent(String(bankCode).trim().toUpperCase())
  let url = `https://img.vietqr.io/image/${cleanBank}-${cleanStk}-${template}.png`
  const params = new URLSearchParams()
  if (accountName) params.append('accountName', accountName.trim().toUpperCase())
  if (amount && Number(amount) > 0) params.append('amount', String(amount))
  if (addInfo) params.append('addInfo', addInfo.trim())
  const query = params.toString()
  return query ? `${url}?${query}` : url
}

