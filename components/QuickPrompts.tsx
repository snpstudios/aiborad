import React from 'react';

const QUICK_PROMPTS = [
    { name: 'Select a quick effect...', value: '' },
    { name: 'Image to Figure', value: 'turn this photo into a character figure. Behind it, place a box with the character’s image printed on it, and a computer showing the Blender modeling process on its screen. In front of the box, add a round plastic base with the character figure standing on it. set the scene indoors if possible' },
    { name: 'Change Character Perspective', value: 'change the Camera anglo a high-angled selfie perspective looking down at the woman, while preserving her exact facial features, expression, and clothing, Maintain the same living room interior background with the sofa, natural lighting, and overall photographic composition and style.' },
    { name: 'Architecture to Model', value: 'convert this photo into a architecture model. Behind the model, there should be a cardboard box with an image of the architecture from the photo on it. There should also be a computer, with the content on the computer screen showing the Blender modeling process of the figurine. In front of the cardboard box, place a cardstock and put the architecture model from the photo I provided on it. I hope the PVC material can be clearly presented. It would be even better if the background is indoors.' },
    { name: 'Combine Objects', value: '把它们组合起来' },
    { name: 'High-Res Restoration', value: 'Enhance this image to high resolution' },
    { name: 'Image to Line Art', value: '变成线稿手绘图' },
    { name: 'Color with Palette', value: '准确使用色卡上色' },
    { name: 'Generate Character Sheet', value: '为我生成人物的角色设定（Character Design）\n\n比例设定（不同身高对比、头身比等）\n\n三视图（正面、侧面、背面）\n\n表情设定（Expression Sheet） \n\n动作设定（Pose Sheet） → 各种常见姿势\n\n服装设定（Costume Design）' },
    { name: 'Virtual/Reality Blend', value: '在图中加上一对情侣坐在座位上开心的喝咖啡和交谈，人物都是粗线稿可爱插画风格' },
    { name: 'Anime to Photorealistic', value: 'Generate a highly detailed photo of a girl cosplaying this illustration, at Comiket. Exactly replicate the same pose, body posture, hand gestures, facial expression, and camera framing as in the original illustration. Keep the same angle, perspective, and composition, without any deviation' },
    { name: 'Pose Reference', value: '人物准确换成姿势图的姿势，专业摄影棚拍摄' },
    { name: 'Image to Action Figure', value: 'Transform the the person in the photo into an action figure, styled after [CHARACTER_NAME] from [SOURCE / CONTEXT]. \nNext to the figure, display the accessories including [ITEM_1], [ITEM_2], and [ITEM_3]. \nOn the top of the toy box, write "[BOX_LABEL_TOP]", and underneath it, "[BOX_LABEL_BOTTOM]". \nPlace the box in a [BACKGROUND_SETTING] environment. \nVisualize this in a highly realistic way with attention to fine details.' },
    { name: 'Image to Funko Pop', value: "Transform the person in the photo into the style of a Funko Pop figure packaging box, presented in an isometric perspective. Label the packaging with the title 'ZHOGUE'. Inside the box, showcase the figure based on the person in the photo, accompanied by their essential items (such as cosmetics, bags, or others). Next to the box, also display the actual figure itself outside of the packaging, rendered in a realistic and lifelike style." },
    { name: 'Image to LEGO', value: "Transform the person in the photo into the style of a LEGO minifigure packaging box, presented in an isometric perspective. Label the packaging with the title 'ZHOGUE'. Inside the box, showcase the LEGO minifigure based on the person in the photo, accompanied by their essential items (such as cosmetics, bags, or others) as LEGO accessories. Next to the box, also display the actual LEGO minifigure itself outside of the packaging, rendered in a realistic and lifelike style." },
    { name: 'Image to Knit Doll', value: 'A close-up, professionally composed photograph showing a handmade crocheted yarn doll being gently held in both hands. The doll has a rounded shape and an adorable chibi-style appearance, with vivid color contrasts and rich details. The hands holding the doll appear natural and tender, with clearly visible finger posture, and the skin texture and light-shadow transitions look soft and realistic, conveying a warm, tangible touch. The background is slightly blurred, depicting an indoor setting with a warm wooden tabletop and natural light streaming in through a window, creating a cozy and intimate atmosphere. The overall image conveys a sense of exquisite craftsmanship and a cherished, heartwarming emotion.' },
    { name: 'Image to Barbie Doll', value: "Transform the person in the photo into the style of a Barbie doll packaging box, presented in an isometric perspective. Label the packaging with the title 'ZHOGUE'. Inside the box, showcase the Barbie doll version of the person from the photo, accompanied by their essential items (such as cosmetics, bags, or others) designed as stylish Barbie accessories. Next to the box, also display the actual Barbie doll itself outside of the packaging, rendered in a realistic and lifelike style, resembling official Barbie promotional renders" },
    { name: 'Anything to Gundam', value: "Transform the person in the photo into the style of a Gundam model kit packaging box, presented in an isometric perspective. Label the packaging with the title 'ZHOGUE'. Inside the box, showcase a Gundam-style mecha version of the person from the photo, accompanied by their essential items (such as cosmetics, bags, or others) redesigned as futuristic mecha accessories. The packaging should resemble authentic Gunpla boxes, with technical illustrations, instruction-manual style details, and sci-fi typography. Next to the box, also display the actual Gundam-style mecha figure itself outside of the packaging, rendered in a realistic and lifelike style, similar to official Bandai promotional renders." },
    { name: 'Cyber-Baby Generator', value: '生成图中两人物所生孩子的样子，专业摄影' },
    { name: 'Product Design to Reality', value: 'turn this illustration of a perfume into a realistic version, Frosted glass bottle with a marble cap' },
    { name: 'Photo to Pro Shot', value: 'Transform the person in the photo into highly stylized ultra-realistic portrait, with sharp facial features and flawless fair skin, standing confidently against a bold green gradient background. Dramatic, cinematic lighting highlights her facial structure, evoking the look of a luxury fashion magazine cover. Editorial photography style, high-detail, 4K resolution, symmetrical composition, minimalistic background' },
    { name: 'Lighting Reference', value: '原图换成参考图打光，专业摄影' },
    { name: 'Generate Painting Process', value: '为人物生成绘画过程四宫格，第一步：线稿，第二步平铺颜色，第三步：增加阴影，第四步：细化成型。不要文字' },
    { name: 'Any Style to Realistic', value: 'turn this illustration into realistic version' },
    { name: 'Image to Keychain', value: '把这张照片变成一个可爱挂件 挂在 照片的包包上\n把这张照片变成一个亚克力材质的扁平钥匙扣 挂在 照片的包包上\n把这张照片变成一个橡胶材质的扁平钥匙扣 挂在照片的包包上' },
    { name: 'Superimpose Effects', value: '为图片照片叠加上效果图片的效果' },
    { name: 'Product Packaging Mockup', value: '把图片贴在包装盒上，并放在极简设计的布景中，专业摄影' },
    { name: 'Virtual Makeup Try-on', value: '为人物化上图片的妆，还保持人物原本的姿势' },
    { name: 'Expression Reference', value: '人物换成新图片的表情' },
];

interface QuickPromptsProps {
    setPrompt: (prompt: string) => void;
    disabled: boolean;
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ setPrompt, disabled }) => {
    const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value) {
            setPrompt(e.target.value);
        }
    };

    return (
        <select
            onChange={handleSelect}
            disabled={disabled}
            className="w-full p-2 bg-gray-100 text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer text-sm"
            defaultValue=""
        >
            {QUICK_PROMPTS.map((item, index) => (
                <option key={index} value={item.value}>
                    {item.name}
                </option>
            ))}
        </select>
    );
};
