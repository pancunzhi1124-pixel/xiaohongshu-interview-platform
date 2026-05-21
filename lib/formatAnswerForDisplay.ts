export function formatAnswerForDisplay(text: string) {
  return text
    .replace(/([^\n])((答题思路|核心得分点|完整参考答案|评分标准)：)/g, "$1\n$2")
    .replace(/([^\n])((第一|第二|第三|第四|第五|第六|首先|其次|再次|最后)[，、])/g, "$1\n$2")
    .replace(/([^\n])((一是|二是|三是|四是|五是))/g, "$1\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
