import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {seedAdmin,localAdmin} from '../../scripts/member-hub/local.mjs';

test('file-only News, Event and Page content supports direct uploads, preview, publication and private access',async({page,browser,request},info)=>{
  test.setTimeout(180000);
  const {service}=await seedAdmin(), prefix=`Flyer ${randomUUID()}`;
  const assetIds=[], titles=[];
  const pdfPage=await browser.newPage();
  await pdfPage.setContent('<h1>Community Flyer</h1><p>Neighborhood gathering</p>');
  const pdf=await pdfPage.pdf({format:'Letter'}); await pdfPage.close();
  try {
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email',{exact:true}).fill(localAdmin.email);
    await page.getByLabel('Password',{exact:true}).fill(localAdmin.password);
    await page.getByRole('button',{name:'Sign In',exact:true}).click();
    await expect(page).toHaveURL(/\/admin\/content$/);
    let assetId;
    for(const [kind,route]of [['post','news'],['event','events'],['page','content']]) {
      const title=`${prefix} ${kind}`; titles.push(title);
      await page.goto('/admin/content/new');
      await page.getByLabel('Title',{exact:true}).fill(title);
      if(kind!=='post') {
        await page.getByRole('button',{name:'Page Settings',exact:true}).click();
        await page.getByLabel('Content Type',{exact:true}).selectOption(kind);
        await page.getByRole('button',{name:'Edit',exact:true}).click();
      }
      await page.getByRole('button',{name:'File / Flyer',exact:true}).click();
      await expect(page.getByRole('textbox',{name:'Section 1 Text'})).toHaveCount(0);
      const fileSection=page.locator('details').filter({has:page.getByLabel('Section 1 File',{exact:true})});
      await expect(fileSection.locator('select')).toHaveCount(1);
      await expect(fileSection.locator('input:not([type="file"])')).toHaveCount(0);
      await expect(fileSection.locator('input[type="file"]')).toHaveCount(1);
      if(!assetId) {
        await page.getByLabel('Upload section 1 file',{exact:true}).setInputFiles({name:`${prefix}.pdf`,mimeType:'application/pdf',buffer:pdf});
        await expect(page.getByLabel('Section 1 File',{exact:true})).not.toHaveValue('');
        assetId=await page.getByLabel('Section 1 File',{exact:true}).inputValue(); assetIds.push(assetId);
        expect((await service.from('hoa_assets').select('library').eq('id',assetId).single()).data.library).toBe('files');
      } else await page.getByLabel('Section 1 File',{exact:true}).selectOption(assetId);
      await page.getByRole('button',{name:'Side by Side',exact:true}).click();
      const preview=page.frameLocator('iframe[title="Page preview"]');
      await expect(preview.getByRole('link',{name:'Download file',exact:true})).toHaveAttribute('href',`/api/member-hub/assets/${assetId}`);
      await expect(preview.locator('[data-pdf-state="ready"]')).toBeVisible();
      await expect(preview.getByRole('img',{name:`${prefix}.pdf, page 1`,exact:true})).toBeVisible();
      if(kind==='event') {
        await page.getByRole('button',{name:'Publish',exact:true}).click();
        await expect(page.getByRole('alert').filter({hasText:'Add an event start date'})).toBeVisible();
        await expect(page.getByRole('group',{name:'Page Settings',exact:true})).toBeVisible();
        await page.getByLabel('Start (Central Time)',{exact:true}).fill('2099-11-01T09:00');
      }
      await page.getByRole('button',{name:'Publish',exact:true}).click();
      await expect(page.getByRole('status')).toContainText('Page saved.');
      const row=(await service.from('hoa_content').select('*').eq('title',title).single()).data;
      expect(row.body).toEqual([]);expect(row.sections).toHaveLength(1);
      expect(row.sections[0]._type).toBe('fileSection');
      expect((await service.from('hoa_content_assets').select('asset_id').eq('content_id',row.id)).data).toEqual([{asset_id:assetId}]);
      await page.goto(`/${route}/${row.id}`);
      await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
      await expect(page.getByRole('link',{name:'Open file',exact:true})).toHaveAttribute('href',`/api/member-hub/assets/${assetId}?view=1`);
      await expect(page.locator('[data-pdf-state="ready"]')).toBeVisible();
      expect(await page.locator('canvas').first().evaluate(canvas=>{
        const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let ink=0;for(let index=0;index<pixels.length;index+=4)if(pixels[index]<180&&pixels[index+1]<180&&pixels[index+2]<180)ink++;
        return ink;
      })).toBeGreaterThan(100);
      expect((await request.get(`/api/member-hub/assets/${assetId}?view=1`)).headers()['content-type']).toBe('application/pdf');
      await page.setViewportSize({width:390,height:844});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:info.outputPath(`${kind}-file-mobile.png`),fullPage:true});
      await page.setViewportSize({width:1365,height:900});
      await page.goto(`/admin/content/${row.id}`);
      await expect(page.getByLabel('Section 1 File',{exact:true})).toHaveValue(assetId);
    }
    await page.goto('/admin/files');
    await page.getByLabel('Search files',{exact:true}).fill(prefix);
    await expect(page.getByText(`${prefix}.pdf`,{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:`Remove ${prefix}.pdf`,exact:true})).toBeDisabled();
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZ8AAAAASUVORK5CYII=','base64');
    const title=`${prefix} private image`;titles.push(title);
    await page.goto('/admin/content/new');await page.getByLabel('Title',{exact:true}).fill(title);
    await page.getByRole('button',{name:'File / Flyer',exact:true}).click();
    await page.getByLabel('Upload section 1 file',{exact:true}).setInputFiles({name:`${prefix}.png`,mimeType:'image/png',buffer:png});
    await expect(page.getByLabel('Section 1 File',{exact:true})).not.toHaveValue('');
    const imageId=await page.getByLabel('Section 1 File',{exact:true}).inputValue();assetIds.push(imageId);
    await page.getByRole('button',{name:'Page Settings',exact:true}).click();await page.getByLabel('Members Only',{exact:true}).check();
    await page.getByRole('button',{name:'Publish',exact:true}).click();await expect(page.getByRole('status')).toContainText('Page saved.');
    const imageRow=(await service.from('hoa_content').select('id').eq('title',title).single()).data;
    await page.goto(`/news/${imageRow.id}`);await expect(page.getByRole('img',{name:`${prefix}.png`,exact:true})).toBeVisible();
    expect((await request.get(`/api/member-hub/assets/${imageId}`)).status()).toBe(404);
  } finally {
    await service.from('hoa_content').delete().in('title',titles);
    for(const id of assetIds) {
      const row=(await service.from('hoa_assets').select('object_path').eq('id',id).maybeSingle()).data;
      if(row){await service.from('hoa_assets').delete().eq('id',id);await service.storage.from('hoa-content').remove([row.object_path]);}
    }
  }
});
