import { redirect } from "next/navigation";

export default function QuestionsMaintainerRedirect() {
  redirect("/erp/mantenedores?tipo=preguntas");
}
