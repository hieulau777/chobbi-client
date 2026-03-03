import { GoogleAuthCard } from "../_components/GoogleAuthCard";

export default function RegisterPage() {
  return (
    <GoogleAuthCard
      title="Đăng ký"
      subtitle="Tham gia sàn Chobbi"
      buttonLabel="Đăng ký bằng Google"
      callbackUrl="/?fromAuth=1"
      footerText="Đã có tài khoản?"
      footerLinkHref="/login"
      footerLinkLabel="Đăng nhập"
    />
  );
}
