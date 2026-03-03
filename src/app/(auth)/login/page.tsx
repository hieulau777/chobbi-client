import { GoogleAuthCard } from "../_components/GoogleAuthCard";

export default function LoginPage() {
  return (
    <GoogleAuthCard
      title="Đăng nhập"
      subtitle="Vào tài khoản Chobbi của bạn"
      buttonLabel="Đăng nhập bằng Google"
      callbackUrl="/?fromAuth=1"
      footerText="Chưa có tài khoản?"
      footerLinkHref="/register"
      footerLinkLabel="Đăng ký"
    />
  );
}
