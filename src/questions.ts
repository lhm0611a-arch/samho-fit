export interface Question {
  id: number;
  type: string;
  rev: boolean;
  kr: string;
  en: string;
  vn: string;
  ind: string;
}

export const GUIDE_TEXTS: Record<string, {
  title: string;
  timeLabel: string;
  timeVal: string;
  countLabel: string;
  countVal: string;
  warnLabel: string;
  warnVal: string;
  btn: string;
}> = {
  kr: {
    title: "SYSTEM GUIDE",
    timeLabel: "TIME_LIMIT",
    timeVal: "30:00",
    countLabel: "DATA_POINTS",
    countVal: "94",
    warnLabel: "CRITICAL_WARNING",
    warnVal: "솔직하게 답변하세요.<br>답변이 일관되지 않으면 불합격 처리될 수 있습니다.",
    btn: "START EVALUATION"
  },
  vn: {
    title: "HƯỚNG DẪN HỆ THỐNG",
    timeLabel: "THỜI GIAN",
    timeVal: "30:00",
    countLabel: "CÂU HỎI",
    countVal: "94",
    warnLabel: "CẢNH BÁO",
    warnVal: "Hãy trả lời trung thực.<br>Nếu câu trả lời không nhất quán, bạn có thể bị trượt.",
    btn: "START EVALUATION"
  },
  id: {
    title: "PANDUAN SISTEM",
    timeLabel: "WAKTU",
    timeVal: "30:00",
    countLabel: "PERTANYAAN",
    countVal: "94",
    warnLabel: "PERINGATAN",
    warnVal: "Jawablah dengan jujur.<br>Jika jawaban tidak konsisten, Anda bisa gagal.",
    btn: "START EVALUATION"
  },
  en: {
    title: "SYSTEM GUIDE",
    timeLabel: "TIME_LIMIT",
    timeVal: "30:00",
    countLabel: "DATA_POINTS",
    countVal: "94",
    warnLabel: "CRITICAL_WARNING",
    warnVal: "Please answer honestly.<br>Inconsistent answers may result in failure.",
    btn: "START EVALUATION"
  }
};

export const MGMT_GUIDE: Record<string, { title: string }> = {
  C1: { title: "근태·시간" },
  C2: { title: "책임감" },
  R1: { title: "규정 준수" },
  R2: { title: "정직성" },
  T1: { title: "협력 태도" },
  T2: { title: "갈등 관리" },
  E1: { title: "감정 조절" },
  E2: { title: "스트레스 관리" },
  S1: { title: "안전 수칙" },
  S2: { title: "위험 인지" },
  A1: { title: "학습 능력" },
  A2: { title: "조직 적응" }
};

export const QUESTIONS_FULL: Question[] = [
  { id: 1, type: "C1", rev: false, kr: "나는 작업 시작 시간보다 일찍 도착해서 준비한다.", en: "I arrive earlier than the start time to prepare for work.", vn: "Tôi luôn đến sớm hơn giờ làm việc để chuẩn bị.", ind: "Saya selalu datang lebih awal dari jam kerja untuk bersiap-siap." },
  { id: 2, type: "C1", rev: true, kr: "나는 오늘 해야 할 일을 내일로 미룰 때가 있다.", en: "I sometimes put off today's work until tomorrow.", vn: "Đôi khi tôi để dồn việc của hôm nay sang ngày mai.", ind: "Terkadang saya menunda pekerjaan hari ini ke hari esok." },
  { id: 3, type: "C1", rev: false, kr: "일하는 시간에는 개인적인 휴대폰 사용을 하지 않으려 한다.", en: "I try not to use my personal phone during working hours.", vn: "Tôi cố gắng không dùng điện thoại cá nhân trong giờ làm việc.", ind: "Saya berusaha tidak menggunakan ponsel pribadi saat jam kerja." },
  { id: 4, type: "C1", rev: false, kr: "정해진 시간 안에 일을 끝내기 위해 서둘러서 일한다.", en: "I maintain a pace to finish tasks within the designated hours.", vn: "Tôi làm việc nhanh chóng để xong việc đúng thời hạn.", ind: "Saya bekerja dengan giat agar selesai tepat waktu." },
  { id: 5, type: "C1", rev: true, kr: "피곤하면 일에 집중하지 못하고 다른 짓을 할 때가 있다.", en: "When I am tired, I lose focus and do non-work related things.", vn: "Khi mệt, tôi thường mất tập trung and làm việc riêng.", ind: "Saat lelah, saya sulit fokus dan sering melakukan hal lain." },
  { id: 6, type: "C1", rev: false, kr: "오늘 할 일을 메모지나 달력에 적어서 관리한다.", en: "I write down tasks on a note or calendar to manage them.", vn: "Tôi ghi chép công việc cần làm vào sổ hoặc lịch.", ind: "Saya mencatat tugas harian di kertas atau kalender." },
  { id: 7, type: "C1", rev: false, kr: "여러 일이 겹치면 중요한 순서대로 처리한다.", en: "When I have multiple tasks, I handle them in order of importance.", vn: "Khi có nhiều việc, tôi ưu tiên làm việc quan trọng trước.", ind: "Jika ada banyak tugas, saya mendahulukan yang paling penting." },
  { id: 8, type: "C2", rev: false, kr: "내 일은 중간에 멈추지 않고 끝까지 마친다.", en: "I finish my work until the end without stopping halfway.", vn: "Tôi luôn hoàn thành công việc đến cùng, không bỏ dở.", ind: "Saya menyelesaikan pekerjaan sampai tuntas tanpa berhenti di tengah jalan." },
  { id: 9, type: "C2", rev: true, kr: "작은 실수는 관리자에게 말하지 않아도 된다고 생각한다.", en: "I think small mistakes don't need to be reported to the manager.", vn: "Tôi nghĩ những lỗi nhỏ không cần báo cáo với quản lý.", ind: "Saya pikir kesalahan kecil tidak perlu dilaporkan ke atasan." },
  { id: 10, type: "C2", rev: false, kr: "작업이 끝나면 결과가 잘 되었는지 다시 확인한다.", en: "After finishing work, I re-check if the result is correct.", vn: "Xong việc, tôi luôn kiểm tra lại kết quả một lần nữa.", ind: "Setelah selesai, saya memeriksa kembali apakah hasilnya sudah benar." },
  { id: 11, type: "C2", rev: false, kr: "지시 내용이 확실하지 않으면 다시 물어본다.", en: "If instructions are unclear, I ask again.", vn: "Nếu chưa rõ chỉ thị, tôi sẽ hỏi lại ngay.", ind: "Jika instruksi kurang jelas, saya akan bertanya kembali." },
  { id: 12, type: "C2", rev: false, kr: "내 실수로 문제가 생기면 내가 책임지고 해결한다.", en: "If a problem occurs due to my mistake, I take responsibility to solve it.", vn: "Nếu có vấn đề do lỗi của tôi, tôi sẽ chịu trách nhiệm giải quyết.", ind: "Jika ada masalah karena kesalahan saya, saya akan bertanggung jawab." },
  { id: 13, type: "C2", rev: false, kr: "품질 기준이 높아도 맞추기 위해 노력한다.", en: "Even if quality standards are high, I try hard to meet them.", vn: "Dù tiêu chuẩn chất lượng cao, tôi vẫn cố gắng đáp ứng.", ind: "Mặc dù standar kualitasnya tinggi, saya tetap berusaha memenuhinya." },
  { id: 14, type: "C2", rev: true, kr: "일이 잘 안 되면 대충 마무리할 때가 있다.", en: "When work doesn't go well, I sometimes finish it roughly.", vn: "Khi việc không thuận lợi, đôi khi tôi làm cho xong chuyện.", ind: "Saat pekerjaan sulit, terkadang saya menyelesaikannya asal-asalan." },
  { id: 15, type: "R1", rev: false, kr: "나의 생각보다 회사의 규칙이 더 중요하다.", en: "Company rules are more important than my personal thoughts.", vn: "Quy định công ty quan trọng hơn ý kiến cá nhân tôi.", ind: "Peraturan perusahaan lebih penting daripada pendapat pribadi saya." },
  { id: 16, type: "R1", rev: true, kr: "급하면 안전 규칙을 지키지 않아도 된다고 생각한다.", en: "I think safety rules can be skipped if I am in a hurry.", vn: "Tôi nghĩ khi gấp gáp thì có thể bỏ qua quy tắc an toàn.", ind: "Saya pikir dalam keadaan mendesak, aturan keselamatan boleh diabaikan." },
  { id: 17, type: "R1", rev: false, kr: "일하는 중에는 내 자리를 비우지 않으려 한다.", en: "I try not to leave my designated spot while working.", vn: "Tôi cố gắng không rời vị trí khi đang làm việc.", ind: "Saya berusaha tidak meninggalkan tempat kerja saat sedang bertugas." },
  { id: 18, type: "R1", rev: false, kr: "들어가지 말라는 곳은 이유를 몰라도 절대 들어가지 않는다.", en: "I never enter restricted areas even if I don't know the reason.", vn: "Tôi tuyệt đối không vào khu vực cấm dù không biết lý do.", ind: "Saya tidak akan masuk ke area terlarang meskipun tidak tahu alasannya." },
  { id: 19, type: "R1", rev: false, kr: "관리자가 없어도 규칙을 잘 지킨다.", en: "I follow rules well even without a manager watching.", vn: "Tôi vẫn tuân thủ quy định ngay cả khi không có quản lý.", ind: "Saya tetap patuh aturan meskipun tidak diawasi atasan." },
  { id: 20, type: "R1", rev: false, kr: "일이 복잡해도 정해진 순서대로 한다.", en: "Even if the work is complex, I follow the set order.", vn: "Dù việc phức tạp, tôi vẫn làm theo đúng trình tự.", ind: "Meskipun pekerjaannya rumit, saya tetap mengikuti urutan yang ada." },
  { id: 21, type: "R1", rev: true, kr: "다른 사람이 규칙을 어기면, 나도 따라서 어기고 싶어진다.", en: "If others break the rules, I feel like breaking them too.", vn: "Khi thấy người khác vi phạm, tôi cũng muốn làm theo.", ind: "Jika orang lain melanggar aturan, saya juga ingin ikut melanggarnya." },
  { id: 22, type: "R2", rev: false, kr: "실수나 사고는 즉시 거짓 없이 보고해야 산다.", en: "Mistakes or accidents must be reported immediately and honestly.", vn: "Lỗi sai hoặc tai nạn phải được báo cáo trung thực ngay lập tức.", ind: "Kesalahan atau kecelakaan harus segera dilaporkan dengan jujur." },
  { id: 23, type: "R2", rev: false, kr: "회사의 물건을 개인적으로 가져가거나 쓰지 않는다.", en: "I do not take or use company items for personal use.", vn: "Tôi không lấy đồ của công ty về dùng riêng.", ind: "Saya tidak mengambil barang perusahaan untuk kepentingan pribadi." },
  { id: 24, type: "R2", rev: false, kr: "거짓말로 작업 기록을 꾸며 달라는 부탁은 거절한다.", en: "I refuse requests to falsify documents.", vn: "Tôi từ chối mọi yêu cầu làm giả hồ sơ công việc.", ind: "Saya menolak jika diminta untuk memalsukan catatan kerja." },
  { id: 25, type: "R2", rev: true, kr: "친한 동료가 잘못하면 모른 척 넘어갈 때가 있다.", en: "If a close colleague does wrong, I sometimes pretend not to know.", vn: "Đôi khi tôi làm ngơ khi đồng nghiệp thân thiết làm sai.", ind: "Terkadang saya pura-pura tidak tahu saat rekan dekat berbuat salah." },
  { id: 26, type: "R2", rev: false, kr: "내가 잘못했을 때는 인정하고 사과한다.", en: "When I do wrong, I admit it and apologize.", vn: "Khi làm sai, tôi sẵn sàng thừa nhận và xin lỗi.", ind: "Saat saya làm sai, tôi sẵn sàng thừa nhận và xin lỗi." },
  { id: 27, type: "R2", rev: false, kr: "다른 사람이 한 일을 내가 했다고 하지 않는다.", en: "I do not claim credit for what others have done.", vn: "Tôi không nhận vơ công sức của người khác là của mình.", ind: "Saya tidak mengaku-ngaku hasil kerja orang lain sebagai milik saya." },
  { id: 28, type: "R2", rev: true, kr: "결과가 좋으면 과정은 보고하지 않아도 된다고 생각한다.", en: "I think if the result is good, the process doesn't need reporting.", vn: "Tôi nghĩ kết quả tốt là được, không cần báo cáo quá trình.", ind: "Saya pikir jika hasilnya bagus, prosesnya tidak perlu dilaporkan." },
  { id: 29, type: "T1", rev: false, kr: "동료가 힘들어 보이면 내가 먼저 도와준다.", en: "If a colleague looks tired, I help them first.", vn: "Thấy đồng nghiệp vất vả, tôi sẽ chủ động giúp đỡ.", ind: "Jika rekan kerja terlihat kesulitan, saya akan membantunya lebih dulu." },
  { id: 30, type: "T1", rev: false, kr: "새로운 직원이 오면 먼저 다가가서 일을 알려준다.", en: "When a new employee comes, I approach them first to teach the work.", vn: "Tôi chủ động hướng dẫn việc cho nhân viên mới.", ind: "Saat ada karyawan baru, saya akan mendekati dan mengajarinya." },
  { id: 31, type: "T1", rev: false, kr: "팀의 목표를 위해서라면 내 의견을 양보할 수 있다.", en: "I can give up my opinion for the team's goal.", vn: "Tôi sẵn sàng nhường ý kiến cá nhân vì mục tiêu chung của nhóm.", ind: "Saya bisa mengalah demi mencapai tujuan tim." },
  { id: 32, type: "T1", rev: true, kr: "다른 사람을 돕는 것이 귀찮거나 힘들 때가 있다.", en: "Helping others is sometimes annoying or burdensome.", vn: "Đôi khi việc giúp người khác khiến tôi thấy phiền phức.", ind: "Terkadang membantu orang lain terasa merepotkan atau melelahkan." },
  { id: 33, type: "T1", rev: false, kr: "모르는 것이 있으면 미루지 않고 바로 물어본다.", en: "If I don't know something, I ask immediately without delay.", vn: "Nếu không biết, tôi sẽ hỏi ngay lập tức.", ind: "Jika tidak tahu, saya akan langsung bertanya saat itu juga." },
  { id: 34, type: "T1", rev: false, kr: "동료가 무엇을 잘하고 무엇을 못하는지 파악하려고 전념한다.", en: "I try to understand what my colleagues are good and bad at.", vn: "Tôi cố gắng tìm hiểu thế mạnh và điểm yếu của đồng nghiệp.", ind: "Saya mencoba memahami apa kelebihan dan kekurangan rekan kerja." },
  { id: 35, type: "T1", rev: false, kr: "동료가 일을 잘하면 칭찬해 준다.", en: "I praise my colleagues when they do a good job.", vn: "Tôi luôn khen ngợi khi đồng nghiệp làm việc tốt.", ind: "Saya memberikan pujian jika rekan kerja bekerja dengan baik." },
  { id: 36, type: "T2", rev: false, kr: "상대의 의견이 나와 달라도 끝까지 듣는다.", en: "I listen to others until the end even if their opinion is different.", vn: "Tôi lắng nghe hết ý kiến của người khác dù khác với mình.", ind: "Saya mendengarkan pendapat orang lain sampai selesai meskipun berbeda." },
  { id: 37, type: "T2", rev: true, kr: "화가 나면 얼굴 표정에 바로 나타난다.", en: "When I am angry, it shows immediately on my face.", vn: "Khi tức giận, nét mặt tôi hiện rõ ngay lập tức.", ind: "Saat marah, raut wajah saya langsung terlihat." },
  { id: 38, type: "T2", rev: false, kr: "동료와 문제가 생기면 해결 방법부터 찾는다.", en: "If I have a problem with a colleague, I look for a solution first.", vn: "Khi có vấn đề với đồng nghiệp, tôi ưu tiên tìm cách giải quyết.", ind: "Jika ada masalah dengan rekan kerja, saya mencari solusinya dulu." },
  { id: 39, type: "T2", rev: false, kr: "동료 험담(나쁜 말)을 할 때 같이 맞장구치지 않는다.", en: "I do not join in when others speak ill of colleagues.", vn: "Tôi không bao giờ hùa theo khi người khác nói xấu đồng nghiệp.", ind: "Saya tidak ikut-ikutan saat orang lain membicarakan keburukan rekan kerja." },
  { id: 40, type: "T2", rev: false, kr: "내가 잘못했을 때는 변명하지 않고 바로 사과한다.", en: "When I am wrong, I apologize immediately without excuses.", vn: "Khi sai, tôi xin lỗi ngay mà không bao biện.", ind: "Saat saya salah, saya langsung minta maaf tanpa alasan." },
  { id: 41, type: "T2", rev: true, kr: "기분이 나쁘면 남에게 상처 주는 말을 할 때가 있다.", en: "When I feel bad, I sometimes say hurtful things to others.", vn: "Lúc bực bội, đôi khi tôi nói những lời gây tổn thương.", ind: "Saat suasana hati buruk, terkadang saya mengucapkan kata-kata kasar." },
  { id: 42, type: "T2", rev: false, kr: "분위기가 나쁘면 말을 줄이고 상황을 살핀다.", en: "If the atmosphere is bad, I speak less and observe the situation.", vn: "Khi không khí căng thẳng, tôi ít nói lại và quan sát xung quanh.", ind: "Jika suasana sedang buruk, saya akan diam dan memantau keadaan." },
  { id: 43, type: "E1", rev: false, kr: "꾸중을 들어도 기분이 금방 풀린다.", en: "Even if I am scolded, I feel better quickly.", vn: "Dù bị mắng, tâm trạng tôi cũng nhanh chóng hồi phục.", ind: "Meskipun dimarahi, perasaan saya cepat membaik kembali." },
  { id: 44, type: "E1", rev: true, kr: "작은 일에도 쉽게 화가 난다.", en: "I get angry easily even at small things.", vn: "Tôi dễ nổi cáu dù chỉ là chuyện nhỏ.", ind: "Saya mudah marah meskipun karena hal kecil." },
  { id: 45, type: "E1", rev: false, kr: "긴장되는 상황에서도 침착하려고 노력한다.", en: "I try to stay calm even in tense situations.", vn: "Tôi cố gắng giữ bình tĩnh trong những tình huống căng thẳng.", ind: "Saya berusaha tetap tenang meskipun dalam keadaan tegang." },
  { id: 46, type: "E1", rev: false, kr: "예민한 사람들과 함께 있어도 내 기분을 잘 관리한다.", en: "I manage my mood well even when with sensitive people.", vn: "Ở cạnh người nhạy cảm, tôi vẫn giữ được tâm trạng ổn định.", ind: "Saya tetap bisa menjaga emosi meskipun bersama orang-orang yang sensitif." },
  { id: 47, type: "E1", rev: true, kr: "기분이 나쁘면 일에 집중하기 어렵다.", en: "It is hard to concentrate on work when I feel bad.", vn: "Khó tập trung làm việc khi tâm trạng không tốt.", ind: "Sulit bagi saya untuk fokus kerja saat perasaan sedang buruk." },
  { id: 48, type: "E1", rev: false, kr: "다툼이 생기면 내 표정부터 관리한다.", en: "When a fight occurs, I control my facial expression first.", vn: "Khi có tranh cãi, việc đầu tiên tôi làm là kiềm chế cảm xúc.", ind: "Jika terjadi perselisihan, saya menjaga raut wajah saya terlebih dahulu." },
  { id: 49, type: "E1", rev: false, kr: "내 기분이 안 좋아도 일에는 영향이 없도록 한다.", en: "I make sure my bad mood doesn't affect my work.", vn: "Tôi không để tâm trạng riêng ảnh hưởng đến công việc.", ind: "Saya memastikan perasaan pribadi tidak mengganggu pekerjaan." },
  { id: 50, type: "E2", rev: false, kr: "일이 많아도 당황하지 않고 하나씩 순서대로 한다.", en: "Even with lots of work, I don't panic and do it one by one.", vn: "Dù nhiều việc, tôi vẫn bình tĩnh làm từng bước một.", ind: "Meskipun banyak tugas, saya tidak panik dan mengerjakannya satu per satu." },
  { id: 51, type: "E2", rev: false, kr: "실수하면 다시는 같은 실수를 하지 않으려고 노력한다.", en: "If I make a mistake, I try not to make the same mistake again.", vn: "Tôi cố gắng không bao giờ lặp lại cùng một lỗi sai.", ind: "Saya berusaha agar tidak mengulangi kesalahan yang sama." },
  { id: 52, type: "E2", rev: true, kr: "일이 잘 안 풀리면 그만두고 싶을 때가 있다.", en: "When work doesn't go well, I sometimes want to quit.", vn: "Lúc việc không suôn sẻ, đôi khi tôi muốn bỏ cuộc.", ind: "Terkadang saya ingin menyerah saat pekerjaan tidak berjalan lancar." },
  { id: 53, type: "E2", rev: false, kr: "힘들어도 끝까지 책임지고 한다.", en: "Even if it's hard, I take responsibility until the end.", vn: "Dù vất vả, tôi vẫn làm đến cùng với tinh thần trách nhiệm.", ind: "Meskipun sulit, saya tetap bertanggung jawab sampai akhir." },
  { id: 54, type: "E2", rev: true, kr: "스트레스를 받으면 잠시 쉬고 다시 일에 집중한다.", en: "When stressed, I rest a bit and focus on work again.", vn: "Khi căng thẳng, tôi nghỉ ngơi một lát rồi quay lại làm việc.", ind: "Saat stres, saya beristirahat sejenak lalu kembali fokus bekerja." },
  { id: 55, type: "E2", rev: true, kr: "몸이 피곤하면 일을 계속하기 어렵다.", en: "It is hard to continue working when my body is tired.", vn: "Cơ thể mệt mỏi khiến tôi khó tiếp tục làm việc.", ind: "Sulit bagi saya untuk terus bekerja saat badan terasa lelah." },
  { id: 56, type: "E2", rev: false, kr: "먼 미래를 위해 지금의 고생을 참을 수 있다.", en: "I can endure current hardships for the distant future.", vn: "Tôi có thể chịu khổ hiện tại vì một tương lai tươi sáng.", ind: "Saya bisa menahan kesulitan saat ini demi masa depan yang lebih baik." },
  { id: 57, type: "S1", rev: false, kr: "보호구가 불편해도 반드시 착용한다.", en: "I always wear safety gear even if it is uncomfortable.", vn: "Tôi luôn mặc đồ bảo hộ dù có thấy bất tiện.", ind: "Saya selalu memakai alat pelindung diri meskipun tidak nyaman." },
  { id: 58, type: "S1", rev: true, kr: "짧은 시간 작업할 때는 보호구를 안 써도 된다고 생각한다.", en: "I think safety gear is not needed for short tasks.", vn: "Tôi nghĩ khi làm việc nhanh thì không cần mặc đồ bảo hộ.", ind: "Saya pikir tidak perlu memakai pelindung jika hanya bekerja sebentar." },
  { id: 59, type: "S1", rev: false, kr: "일의 속도보다 안전 규칙이 더 중요하다.", en: "Safety rules are more important than work speed.", vn: "Quy tắc an toàn quan trọng hơn tốc độ làm việc.", ind: "Aturan keselamatan lebih penting daripada kecepatan kerja." },
  { id: 60, type: "S1", rev: false, kr: "안전교육 내용을 떠올리려 한다.", en: "I work while thinking about what I learned in safety training.", vn: "Tôi luôn nhớ lại kiến thức đào tạo an toàn khi làm việc.", ind: "Saya selalu mengingat materi pelatihan keselamatan saat bekerja." },
  { id: 61, type: "S1", rev: true, kr: "규칙이 너무 많으면 몇 개는 무시해도 된다고 생각한다.", en: "I think if there are too many rules, some can be ignored.", vn: "Tôi nghĩ nếu có quá nhiều quy tắc thì có thể bỏ qua vài cái.", ind: "Saya pikir jika aturannya terlalu banyak, beberapa boleh diabaikan." },
  { id: 62, type: "S1", rev: false, kr: "이유를 몰라도 안전 규칙은 무조건 지킨다.", en: "I follow safety rules unconditionally even if I don't know the reason.", vn: "Tôi luôn tuân thủ quy tắc an toàn vô điều kiện.", ind: "Saya selalu mematuhi aturan keselamatan tanpa syarat." },
  { id: 63, type: "S1", rev: false, kr: "작업 전에 위험한 것이 없는지 확인한다.", en: "I check for any dangers before working.", vn: "Tôi luôn kiểm tra các mối nguy hiểm trước khi bắt đầu.", ind: "Saya selalu memeriksa potensi bahaya sebelum mulai bekerja." },
  { id: 64, type: "S2", rev: false, kr: "작업 전에 주변을 잘 살펴본다.", en: "I look around carefully before working.", vn: "Tôi luôn quan sát kỹ xung quanh trước khi làm việc.", ind: "Saya selalu memperhatikan keadaan sekitar sebelum mulai bekerja." },
  { id: 65, type: "S2", rev: false, kr: "장비가 이상하면 바로 보고한다.", en: "If the equipment is strange, I report it immediately.", vn: "Thấy thiết bị có vấn đề, tôi sẽ báo cáo ngay.", ind: "Jika alat kerja terasa aneh, saya akan segera melaporkannya." },
  { id: 66, type: "S2", rev: true, kr: "위험한 상황을 별로 중요하지 않게 생각할 때가 있다.", en: "I sometimes think dangerous situations are not very important.", vn: "Đôi khi tôi coi thường những tình huống nguy hiểm.", ind: "Terkadang saya menganggap situasi berbahaya sebagai hal yang biasa saja." },
  { id: 67, type: "S2", rev: false, kr: "위험한 작업을 하기 전에는 꼼꼼하게 확인한다.", en: "I check thoroughly before doing dangerous work.", vn: "Tôi kiểm tra cực kỳ kỹ lưỡng trước khi làm việc nguy hiểm.", ind: "Saya memeriksa dengan sangat teliti sebelum melakukan pekerjaan berbahaya." },
  { id: 68, type: "S2", rev: false, kr: "지나가는 길에 물건이 있으면 내가 먼저 치운다.", en: "If there are things in the way, I clear them first.", vn: "Thấy vật cản lối đi, tôi sẽ chủ động dọn dẹp.", ind: "Jika ada barang yang menghalangi jalan, saya akan menyingkirkannya sendiri." },
  { id: 69, type: "S2", rev: true, kr: "일하는 중에 장난을 치면 분위기가 좋아진다고 생각한다.", en: "I think playing around while working makes the atmosphere better.", vn: "Tôi nghĩ vừa làm vừa đùa giỡn sẽ giúp không khí thoải mái hơn.", ind: "Saya pikir bercanda saat bekerja bisa membuat suasana jadi lebih baik." },
  { id: 70, type: "S2", rev: false, kr: "위험을 발견하면 바로 작업을 멈추고 알린다.", en: "If I find a danger, I stop work immediately and notify others.", vn: "Phát hiện nguy hiểm, tôi dừng việc ngay và thông báo cho mọi người.", ind: "Jika melihat bahaya, saya segera berhenti bekerja dan memberi tahu yang lain." },
  { id: 71, type: "A1", rev: false, kr: "새로운 일이 어려워도 배우려고 노력한다.", en: "Even if new work is hard, I try to learn it.", vn: "Dù việc mới khó, tôi vẫn nỗ lực học hỏi.", ind: "Meskipun pekerjaan baru terasa sulit, saya tetap berusaha mempelajarinya." },
  { id: 72, type: "A1", rev: true, kr: "일하는 방식이 바뀌면 처음에는 싫은 마음이 든다.", en: "When the way of working changes, I dislike it at first.", vn: "Tôi thấy khó chịu khi cách thức làm việc bị thay đổi.", ind: "Saya merasa kesal jika cara kerja diubah-ubah." },
  { id: 73, type: "A1", rev: false, kr: "문제가 생기면 불평하기보다 해결 방법을 찾는다.", en: "When a problem occurs, I look for a solution rather than complaining.", vn: "Khi có sự cố, tôi tìm cách giải quyết thay vì than phiền.", ind: "Jika ada masalah, saya mencari jalan keluar daripada mengeluh." },
  { id: 74, type: "A1", rev: false, kr: "새로운 장비는 사용법을 먼저 배우고 쓴다.", en: "I learn how to use new equipment before using it.", vn: "Tôi luôn học cách dùng thiết bị mới trước khi vận hành.", ind: "Saya selalu mempelajari cara penggunaan alat baru sebelum memakainya." },
  { id: 75, type: "A1", rev: false, kr: "새로운 방식보다 옛날 방식이 더 낫다고 느낄 때가 있다.", en: "I sometimes feel the old way is better than the new way.", vn: "Đôi khi tôi thấy cách làm cũ hiệu quả hơn cách mới.", ind: "Terkadang saya merasa cara lama lebih baik daripada cara baru." },
  { id: 76, type: "A1", rev: false, kr: "실패해도 배우는 것이 있다고 생각한다.", en: "I think there is something to learn even if I fail.", vn: "Tôi nghĩ thất bại cũng mang lại những bài học quý giá.", ind: "Saya pikir selalu ada pelajaran yang bisa diambil meskipun gagal." },
  { id: 77, type: "A1", rev: false, kr: "작업 상황이 바뀌어도 빨리 적응한다.", en: "I adapt quickly even if the work situation changes.", vn: "Tôi thích nghi rất nhanh với sự thay đổi của công việc.", ind: "Saya cepat beradaptasi meskipun situasi kerja berubah." },
  { id: 78, type: "A2", rev: false, kr: "지시 내용을 잘 모르면 알 때까지 물어본다.", en: "If I don't understand the instructions, I ask until I know.", vn: "Chưa rõ chỉ thị, tôi sẽ hỏi cho đến khi hiểu rõ mới thôi.", ind: "Jika belum paham instruksi, saya akan terus bertanya sampai mengerti." },
  { id: 79, type: "A2", rev: false, kr: "언어와 문화가 달라도 대화하려고 노력한다.", en: "Even if language and culture are different, I try to converse.", vn: "Dù khác biệt ngôn ngữ, tôi vẫn nỗ lực giao tiếp.", ind: "Meskipun bahasa dan budaya berbeda, saya tetap berusaha berkomunikasi." },
  { id: 80, type: "A2", rev: true, kr: "도움을 요청하는 것이 부끄럽다.", en: "It is embarrassing to ask for help.", vn: "Tôi thấy ngại khi phải nhờ vả người khác giúp đỡ.", ind: "Saya merasa malu jika harus meminta bantuan orang lain." },
  { id: 81, type: "A2", rev: false, kr: "새로운 팀에 가면 먼저 인사한다.", en: "When I go to a new team, I greet them first.", vn: "Đến nhóm mới, tôi luôn chủ động chào hỏi trước.", ind: "Saat masuk ke tim baru, saya akan menyapa mereka terlebih dahulu." },
  { id: 82, type: "A2", rev: false, kr: "근무 시간이 바뀌어도 불평하지 않고 적응한다.", en: "I adapt without complaint even if work hours change.", vn: "Tôi chấp nhận sự thay đổi giờ làm mà không phàn nàn.", ind: "Saya beradaptasi tanpa mengeluh meskipun jam kerja berubah." },
  { id: 83, type: "A2", rev: true, kr: "새로운 사람과 일하면 피곤하다.", en: "Working with new people is tiring.", vn: "Làm việc với người lạ khiến tôi thấy mệt mỏi.", ind: "Bekerja dengan orang baru terasa melelahkan bagi saya." },
  { id: 84, type: "A2", rev: false, kr: "다른 나라 동료와도 잘 지낸다.", en: "I get along well with colleagues from other countries.", vn: "Tôi hòa đồng với đồng nghiệp đến các quốc gia khác.", ind: "Saya bisa berteman baik dengan rekan kerja dari negara lain." },
  { id: 85, type: "REL", rev: false, kr: "나는 태어나서 한 번도 마감 시간을 어긴 적이 없다.", en: "I have never missed a deadline in my life.", vn: "Tôi chưa bao giờ trễ hẹn dù chỉ một lần trong đời.", ind: "Saya tidak pernah melewatkan batas waktu seumur hidup saya." },
  { id: 86, type: "REL", rev: false, kr: "나는 태어나서 한 번도 화를 낸 적이 없다.", en: "I have never gotten angry in my life.", vn: "Tôi chưa bao giờ tức giận trong cuộc đời mình.", ind: "Saya tidak pernah marah sekalipun seumur hidup saya." },
  { id: 87, type: "REL", rev: false, kr: "나는 태어나서 한 번도 규칙을 어긴 적이 없다.", en: "I have never broken a rule in my life.", vn: "Tôi chưa bao giờ vi phạm quy tắc nào trong đời.", ind: "Saya tidak pernah melanggar aturan seumur hidup saya." },
  { id: 88, type: "REL", rev: false, kr: "나는 직장에서 동료와 다툰 적이 한 번도 없다.", en: "I have never fought with a colleague at work.", vn: "Tôi chưa từng cãi nhau với đồng nghiệp ở nơi làm việc.", ind: "Saya tidak pernah bertengkar dengan rekan kerja di tempat kerja." },
  { id: 89, type: "REL", rev: true, kr: "하기 싫어서 일을 미룰 때가 가끔 있다.", en: "I sometimes put off work because I don't want to do it.", vn: "Đôi khi tôi trì hoãn vì không muốn làm việc đó.", ind: "Terkadang saya menunda pekerjaan karena sedang malas." },
  { id: 90, type: "REL", rev: true, kr: "기분이 안 좋으면 말을 안 할 때가 있다.", en: "I sometimes don't speak when I feel bad.", vn: "Những lúc tâm trạng tệ, tôi thường chọn cách im lặng.", ind: "Terkadang saya diam saja saat sedang tidak bersemangat." },
  { id: 91, type: "REL", rev: true, kr: "나와 성격이 안 맞는 사람과 일하는 것은 불편하다.", en: "It is uncomfortable to work with someone who doesn't match my personality.", vn: "Làm việc với người không hợp tính cách khiến tôi thấy khó chịu.", ind: "Bekerja dengan orang yang tidak cocok sifatnya membuat saya tidak nyaman." },
  { id: 92, type: "REL", rev: true, kr: "내 실수를 인정하는 것이 마음 불편할 때가 있다.", en: "Admitting my mistakes is sometimes uncomfortable.", vn: "Đôi khi việc thừa nhận lỗi sai khiến tôi thấy bối rối.", ind: "Terkadang saya merasa berat untuk mengakui kesalahan saya." },
  { id: 93, type: "REL", rev: false, kr: "나는 하루 종일 일해도 전혀 피곤하지 않다.", en: "I am not tired at all even if I work all day.", vn: "Tôi không thấy mệt mỏi chút nào dù có làm việc cả ngày.", ind: "Saya sama sekali tidak merasa lelah meskipun bekerja seharian penuh." },
  { id: 94, type: "REL", rev: false, kr: "일이 아무리 힘들어도 스트레스를 전혀 받지 않는다.", en: "I don't get stressed at all no matter how hard the work is.", vn: "Dù việc vất vả đến mấy, tôi cũng không hề bị áp lực.", ind: "Saya tidak merasa stres sama sekali seberat apa pun pekerjaannya." }
];
